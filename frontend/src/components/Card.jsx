const Card = ({ children, className = '', title, headerAction }) => {
  return (
    <div className={`card ${className}`}>
      {(title || headerAction) && (
        <div className="card-header flex justify-between items-center">
          {title && <h3 className="card-title">{title}</h3>}
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
