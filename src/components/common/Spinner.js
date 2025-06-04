// src/components/Spinner.js
import React, { useEffect, useState } from 'react';
import styles from '../game/Deathroll/DeathrollGame.module.css';

function Spinner({ options, result }) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!options.length || !result) return;

    const itemWidth = 80; // VIKTIG: må matche .wheelItem i CSS
    const index = options.indexOf(result);
    if (index === -1) return;

    const totalOptions = options.length;
    const loops = 5;

    const offsetToResult = (totalOptions * loops + index) * itemWidth;
    const finalOffset = offsetToResult + itemWidth / 2 - 150; // midt på spinneren

    setIsAnimating(true);
    setTranslateX(-finalOffset);

    const timeout = setTimeout(() => {
      setIsAnimating(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [options, result]);

  const displayItems = [...Array(6)].flatMap(() => options);

  return (
    <div className={styles.spinnerWheel}>
      <div className={styles.wheelPointer}></div>
      <div
        className={styles.wheelStrip}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isAnimating ? 'transform 2.8s cubic-bezier(0.1, 0.9, 0.2, 1)' : 'none',
        }}
      >
        {displayItems.map((opt, i) => (
          <div key={i} className={styles.wheelItem}>
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Spinner;
