// Índice de riesgo de incendio simplificado (0-100)
const Fire = (() => {
  // temp °C · hum % · wind km/h · precip mm/día
  function risk(temp, hum, wind, precip) {
    let score = 0;

    if (temp >= 32)      score += 35;
    else if (temp >= 26) score += 25;
    else if (temp >= 20) score += 15;
    else if (temp >= 14) score += 8;

    if (hum <= 20)       score += 30;
    else if (hum <= 35)  score += 22;
    else if (hum <= 50)  score += 12;
    else if (hum <= 65)  score += 5;

    if (wind >= 50)      score += 25;
    else if (wind >= 35) score += 18;
    else if (wind >= 20) score += 10;
    else if (wind >= 10) score += 4;

    if (precip >= 15)      score -= 40;
    else if (precip >= 5)  score -= 25;
    else if (precip >= 1)  score -= 12;
    else if (precip >= 0.2) score -= 4;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let nivel, color;
    if (score < 20)      { nivel = 'Bajo';      color = '#2a9d8f'; }
    else if (score < 40) { nivel = 'Moderado';  color = '#8ab17d'; }
    else if (score < 60) { nivel = 'Alto';      color = '#f4a261'; }
    else if (score < 80) { nivel = 'Muy alto';  color = '#e76f51'; }
    else                 { nivel = 'Extremo';   color = '#9d0208'; }

    return { score, nivel, color };
  }

  // Calcula el riesgo del día a partir de las horas (toma el mediodía solar)
  function riskForDay(horas) {
    if (!horas || !horas.length) return null;
    const mediodia = horas.filter(h => {
      const hr = new Date(h.t).getHours();
      return hr >= 12 && hr <= 17;
    });
    const set = mediodia.length ? mediodia : horas;
    const tMedia    = set.reduce((s, h) => s + h.temp, 0) / set.length;
    const humMedia  = set.reduce((s, h) => s + (h.hum || 60), 0) / set.length;
    const vientoMax = Math.max(...set.map(h => h.viento));
    const precipTot = horas.reduce((s, h) => s + h.precip, 0);
    return risk(tMedia, humMedia, vientoMax, precipTot);
  }

  return { risk, riskForDay };
})();