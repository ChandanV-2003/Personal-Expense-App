const cloudinary = require('../../config/cloudinary');
const Expense = require('../model/expense');
const { processBillImage } = require('../../services/aiBillParser');

/**
 * Scan bill image, extract data using AI, and save expense
 * POST /api/expenses/scan-bill
 */
const scanBill = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload a bill image.',
      });
    }

    const userId = req.userId;
    const imageBuffer = req.file.buffer;

    // Step 1: Upload image to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'expense-bills',
            resource_type: 'image',
            transformation: [
              { width: 1200, crop: 'limit' }, // Resize large images
              { quality: 'auto:good' }, // Optimize quality
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(imageBuffer);
      });
    } catch (cloudinaryError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image. Please check your Cloudinary credentials.',
        error: cloudinaryError.message,
      });
    }

    // Step 2: Process bill image with OCR and AI
    let parsedBill;
    try {
      parsedBill = await processBillImage(imageBuffer);
    } catch (aiError) {
      // Delete uploaded image if parsing fails
      await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      return res.status(500).json({
        success: false,
        message: 'Failed to parse bill. Please try again or enter details manually.',
        error: aiError.message,
      });
    }

    // Step 3: Validate and prepare expense data
    const amount = parseFloat(parsedBill.amount);
    if (isNaN(amount) || amount <= 0) {
      await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      return res.status(400).json({
        success: false,
        message: 'Could not detect valid amount from bill. Please enter details manually.',
        parsedData: parsedBill,
      });
    }

    // Parse date
    let expenseDate;
    try {
      expenseDate = parsedBill.date ? new Date(parsedBill.date) : new Date();
      // Check if date is valid
      if (isNaN(expenseDate.getTime())) {
        expenseDate = new Date();
      }
    } catch {
      expenseDate = new Date();
    }

    // Step 3.5: Check for duplicate bill in current month
    const startOfMonth = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1);
    const endOfMonth = new Date(expenseDate.getFullYear(), expenseDate.getMonth() + 1, 0, 23, 59, 59);
    
    const existingExpense = await Expense.findOne({
      user: userId,
      amount: amount,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      $or: [
        { description: { $regex: parsedBill.description?.substring(0, 20) || '', $options: 'i' } },
        { billImage: { $exists: true } }
      ]
    });

    if (existingExpense) {
      // Delete the uploaded image since we're not saving
      await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      return res.status(409).json({
        success: false,
        message: 'A similar expense already exists for this month. You may have already added this bill.',
        duplicate: {
          expenseId: existingExpense._id,
          amount: existingExpense.amount,
          category: existingExpense.category,
          description: existingExpense.description,
          date: existingExpense.date,
        },
        parsedData: parsedBill,
      });
    }

    // Step 4: Create and save expense
    // Step 4: Create and save expense
    const expenseData = {
      user: userId,
      amount: amount,
      category: parsedBill.category || 'Other',
      description: parsedBill.description || `Scanned bill - ${req.file.originalname}`,
      date: expenseDate,
      billImage: cloudinaryResult.secure_url,
      billUrl: cloudinaryResult.secure_url,
    };

    const expense = new Expense(expenseData);
    await expense.save();

    // Step 5: Return success response
    return res.status(201).json({
      success: true,
      message: 'Bill scanned and expense saved successfully',
      data: {
        expense: {
          _id: expense._id,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          date: expense.date,
          billImage: expense.billImage,
          createdAt: expense.createdAt,
        },
        parsedData: {
          date: parsedBill.date,
          category: parsedBill.category,
          amount: parsedBill.amount,
          description: parsedBill.description,
        },
        rawText: parsedBill.rawText?.substring(0, 500), // First 500 chars for debugging
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing bill',
      error: error.message,
    });
  }
};

/**
 * Preview bill scan without saving
 * POST /api/expenses/scan-bill/preview
 */
const previewBillScan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided.',
      });
    }

    const imageBuffer = req.file.buffer;

    // Process bill image
    const parsedBill = await processBillImage(imageBuffer);

    return res.status(200).json({
      success: true,
      message: 'Bill preview generated',
      data: {
        parsedData: {
          date: parsedBill.date,
          category: parsedBill.category,
          amount: parsedBill.amount,
          description: parsedBill.description,
        },
        rawText: parsedBill.rawText?.substring(0, 500),
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to preview bill',
      error: error.message,
    });
  }
};

module.exports = {
  scanBill,
  previewBillScan,
};
