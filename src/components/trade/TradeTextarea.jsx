import React, { useState } from 'react';
import { quickEmojis } from './tradeFormConstants.js';

function EmojiMenu({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="emojiMenu">
      <button type="button" className="emojiTrigger" onClick={() => setOpen(!open)}>😊 Emojis</button>
      {open && (
        <div className="emojiDropdown">
          {quickEmojis.map(em => (
            <button type="button" key={em} className="emojiBtn" onClick={() => { onPick(em); setOpen(false); }}>{em}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TextareaWithEmoji({ value, onChange, placeholder, className = 'input', rows }) {
  const add = (em) => onChange({ target: { value: `${value || ''}${em}` } });
  return (
    <div className="emojiField">
      <textarea className={className} rows={rows} placeholder={placeholder} value={value || ''} onChange={onChange} />
      <EmojiMenu onPick={add} />
    </div>
  );
}
