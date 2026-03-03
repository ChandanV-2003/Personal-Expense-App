const axios = require('axios');
const Tesseract = require('tesseract.js');

/**
 * Extract text from image using Tesseract OCR
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromImage = async (imageBuffer) => {
  try {
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        logger: (m) => {
          // Optional: log OCR progress
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${(m.progress * 100).toFixed(2)}%`);
          }
        },
      }
    );
    
    return result.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
};

/**
 * Auto-detect category based on merchant name or description
 * @param {string} text - Text to analyze
 * @returns {string} - Detected category
 */
const autoDetectCategory = (text) => {
  const lowerText = text.toLowerCase();
  
  // Food delivery and restaurants
  if (/swiggy|zomato|uber\s*eats|foodpanda|dominos|pizza|restaurant|hotel|caf[eé]|mcdonalds|kfc|burger/i.test(lowerText)) {
    return 'Food';
  }
  
  // Transport
  if (/uber|ola|rapido|auto|taxi|cab|petrol|diesel|fuel|metro|bus|train|irctc|airline|flight|ola|uber/i.test(lowerText)) {
    return 'Transport';
  }
  
  // Shopping
  if (/amazon|flipkart|myntra|ajio|meesho|snapdeal|shopify|ebay|walmart|target|shopping|mall|retail/i.test(lowerText)) {
    return 'Shopping';
  }
  
  // Housing/Rent
  if (/rent|housing|apartment|flat|maintenance|society|electricity|water|gas|cylinder|broadband|wifi/i.test(lowerText)) {
    return 'Housing';
  }
  
  // Bills & Utilities
  if (/bill|utility|electricity|water|gas|phone|mobile|recharge|dth|internet|broadband/i.test(lowerText)) {
    return 'Bills';
  }
  
  // Health & Medical
  if (/hospital|clinic|pharmacy|medical|medicine|doctor|health|dental|lab|diagnostic/i.test(lowerText)) {
    return 'Health';
  }
  
  // Entertainment
  if (/netflix|amazon\s*prime|hotstar|disney|spotify|youtube|movie|cinema|theatre|entertainment|game/i.test(lowerText)) {
    return 'Entertainment';
  }
  
  // Education
  if (/school|college|university|course|tuition|education|book|stationery|exam|fee/i.test(lowerText)) {
    return 'Education';
  }
  
  // Groceries
  if (/grocery|supermarket|big\s*basket|grofers|dmart|reliance\s*fresh|big\s*bazaar/i.test(lowerText)) {
    return 'Groceries';
  }
  
  return 'Other';
};

/**
 * Parse bill using DeepSeek AI
 * @param {string} ocrText - OCR extracted text
 * @returns {Promise<Object>} - Parsed expense details
 */
const parseBillWithAI = async (ocrText) => {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a bill parsing assistant. Extract structured expense details from bill text.
            
Rules:
1. Return ONLY valid JSON, no markdown, no explanation
2. Date format: YYYY-MM-DD (if year missing, use current year ${new Date().getFullYear()})
3. Amount should be numeric string without currency symbols
4. Category should be one of: Food, Transport, Shopping, Housing, Bills, Health, Entertainment, Education, Groceries, Other
5. Description should be a brief summary (max 100 chars)

JSON Format:
{
  "date": "YYYY-MM-DD",
  "category": "CategoryName",
  "amount": "123.45",
  "description": "Brief description"
}`
          },
          {
            role: 'user',
            content: `Parse this bill text and return JSON:\n\n${ocrText}`
          }
        ],
        temperature: 0,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
    // Parse the JSON response
    let parsedData;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                        aiResponse.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, aiResponse];
      
      const jsonString = jsonMatch[1] || aiResponse;
      parsedData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('AI Response:', aiResponse);
      throw new Error('Failed to parse AI response');
    }

    // Validate and clean the response
    const result = {
      date: parsedData.date || new Date().toISOString().split('T')[0],
      category: parsedData.category || autoDetectCategory(ocrText),
      amount: parsedData.amount ? String(parsedData.amount).replace(/[^0-9.]/g, '') : '',
      description: parsedData.description || '',
    };

    // Auto-detect category if AI returned empty or invalid category
    if (!result.category || result.category === 'Other') {
      result.category = autoDetectCategory(ocrText);
    }

    return result;
  } catch (error) {
    console.error('DeepSeek API Error:', error.response?.data || error.message);
    
    // Fallback: Use rule-based parsing if AI fails
    return fallbackParsing(ocrText);
  }
};

/**
 * Fallback parsing when AI fails
 * @param {string} ocrText - OCR extracted text
 * @returns {Object} - Parsed expense details
 */
const fallbackParsing = (ocrText) => {
  const lines = ocrText.split('\n').filter(line => line.trim());
  
  // Try to find amount (look for numbers with 2 decimal places or currency symbols)
  let amount = '';
  const amountRegex = /(?:₹|Rs\.?|INR)?\s*(\d{1,6}(?:\.\d{2})?)/gi;
  const amounts = [];
  let match;
  
  while ((match = amountRegex.exec(ocrText)) !== null) {
    const num = parseFloat(match[1]);
    if (num > 0) amounts.push(num);
  }
  
  // Use the largest amount (usually the total)
  if (amounts.length > 0) {
    amount = String(Math.max(...amounts));
  }
  
  // Try to find date
  let date = new Date().toISOString().split('T')[0];
  const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
  const dateMatch = ocrText.match(dateRegex);
  
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Auto-detect category
  const category = autoDetectCategory(ocrText);
  
  // Use first line as description (truncated)
  const description = lines[0] ? lines[0].substring(0, 100) : 'Scanned bill';
  
  return { date, category, amount, description };
};

/**
 * Main function to process bill image
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} - Parsed expense details
 */
const processBillImage = async (imageBuffer) => {
  try {
    // Step 1: Extract text using OCR
    console.log('Starting OCR...');
    const ocrText = await extractTextFromImage(imageBuffer);
    console.log('OCR Text extracted:', ocrText.substring(0, 200) + '...');
    
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error('No text found in image');
    }
    
    // Step 2: Parse using AI
    console.log('Parsing with AI...');
    const parsedData = await parseBillWithAI(ocrText);
    console.log('AI Parsed Data:', parsedData);
    
    return {
      ...parsedData,
      rawText: ocrText, // Include raw text for debugging
    };
  } catch (error) {
    console.error('Bill Processing Error:', error);
    throw error;
  }
};

module.exports = {
  processBillImage,
  extractTextFromImage,
  parseBillWithAI,
  autoDetectCategory,
};
