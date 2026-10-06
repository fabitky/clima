const Alerts = (() => {
  const UMBRALES = {
    helada: 3,
    viento_fuerte: 60,
    lluvia_fuerte: 20,
    calor_extremo: 32
  };

  function evaluar(forecast, desdeDia = 0, hastaDia = 3) {
    if (!forecast || !forecast.daily) return [];
    const alertas = [];
    const dias = forecast.daily.slice(desdeDia, hastaDia);

    dias.forEach((d, idx) => {
      const i = idx + desdeDia;
      const fecha = new Date(d.fecha + 'T12:00:00');
      const etiqueta = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' :
        fecha.toLocaleDateString('es-AR', { weekday: 'long' });

      if (d.t_min <= UMBRALES.helada) {
        alertas.push({ tipo: 'helada', icono: '❄️',
          texto: `${etiqueta}: posible helada (mín. ${d.t_min.toFixed(1)}°C). Proteger cultivos.` });
      }
      if (d.viento_max >= UMBRALES.viento_fuerte) {
        alertas.push({ tipo: 'viento', icono: '💨',
          texto: `${etiqueta}: ráfagas fuertes (${d.viento_max} km/h). Asegurar objetos.` });
      }
      if (d.precip >= UMBRALES.lluvia_fuerte) {
        alertas.push({ tipo: 'lluvia', icono: '🌧️',
          texto: `${etiqueta}: lluvia intensa (${d.precip} mm). Precaución en rutas.` });
      }
      if (d.t_max >= UMBRALES.calor_extremo) {
        alertas.push({ tipo: 'calor', icono: '🔥',
          texto: `${etiqueta}: calor extremo (máx. ${d.t_max.toFixed(1)}°C). Hidratarse.` });
      }
    });

    return alertas;
  }

  function actividades(forecast, diaIndex = 0) {
    if (!forecast || !forecast.daily || !forecast.daily[diaIndex]) return [];
    const dia = forecast.daily[diaIndex];
    const acts = [];

    if (dia.precip < 5 && dia.viento_max < 40) {
      acts.push({ nombre: '🌿 Podar / jardinería', estado: 'si', label: 'Buen día' });
    } else if (dia.precip < 15 && dia.viento_max < 55) {
      acts.push({ nombre: '🌿 Podar / jardinería', estado: 'talvez', label: 'Con precaución' });
    } else {
      acts.push({ nombre: '🌿 Podar / jardinería', estado: 'no', label: 'No recomendado' });
    }

    const templado = dia.t_max >= 18 && dia.precip < 3 && dia.viento_max < 45;
    acts.push({
      nombre: '🏞️ Ir al río / lago',
      estado: templado ? 'si' : dia.t_max >= 12 ? 'talvez' : 'no',
      label: templado ? 'Ideal' : dia.t_max >= 12 ? 'Fresco' : 'Muy frío'
    });

    const montania = dia.precip < 5 && dia.viento_max < 50;
    acts.push({
      nombre: '⛰️ Trekking / montaña',
      estado: montania ? 'si' : dia.precip < 15 ? 'talvez' : 'no',
      label: montania ? 'Apto' : dia.precip < 15 ? 'Revisar refugios' : 'No apto'
    });

    if (dia.t_min <= 3) {
      acts.push({ nombre: '🧊 Riesgo de helada', estado: 'no', label: 'Cubrir plantas' });
    } else {
      acts.push({ nombre: '🧊 Riesgo de helada', estado: 'si', label: 'Sin riesgo' });
    }

    const nieve = dia.t_min <= 1 && dia.precip >= 5;
    acts.push({
      nombre: '❄️ Nieve en cordón',
      estado: nieve ? 'si' : 'no',
      label: nieve ? 'Probable' : 'Poco probable'
    });

    return acts;
  }

  return { evaluar, actividades, UMBRALES };
})();