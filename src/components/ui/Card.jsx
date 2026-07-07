import React from 'react';

export function Card({ title, sub, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="cardHead">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
