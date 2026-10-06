const Observations = (() => {

  async function listar() {
    const obs = await Storage.getAll('observations');
    return obs.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  async function guardar(data) {
    const obs = { ...data, creado: Date.now() };
    return Storage.put('observations', obs);
  }

  async function eliminar(id) {
    return Storage.del('observations', id);
  }

  function render() {
    const cont = document.getElementById('obs-lista');
    listar().then(obs => {
      if (!obs.length) {
        cont.innerHTML = '<p class="muted">Aún no registraste observaciones.</p>';
        return;
      }
      cont.innerHTML = obs.map(o => `
        <div class="obs-item">
          <div>
            <strong>${o.fecha}</strong> · ${o.lugar.replace('_',' ')}
            ${o.temp ? ` · ${o.temp}°C` : ''}
            ${o.evento && o.evento !== 'ninguno' ? ` · ${o.evento}` : ''}
            ${o.notas ? `<div class="obs-meta">${o.notas}</div>` : ''}
          </div>
          <button class="obs-del" data-id="${o.id}" title="Eliminar">✕</button>
        </div>
      `).join('');
      cont.querySelectorAll('.obs-del').forEach(btn => {
        btn.onclick = async () => {
          await eliminar(Number(btn.dataset.id));
          render();
        };
      });
    });
  }

  function initForm() {
    const form = document.getElementById('form-obs');
    const fecha = document.getElementById('obs-fecha');
    fecha.value = new Date().toISOString().slice(0, 10);
    form.onsubmit = async (e) => {
      e.preventDefault();
      await guardar({
        fecha: fecha.value,
        lugar: document.getElementById('obs-lugar').value,
        temp: parseFloat(document.getElementById('obs-temp').value) || null,
        viento: document.getElementById('obs-viento').value,
        evento: document.getElementById('obs-evento').value,
        notas: document.getElementById('obs-notas').value.trim()
      });
      form.reset();
      fecha.value = new Date().toISOString().slice(0, 10);
      render();
    };
  }

  return { initForm, render, listar, guardar, eliminar };
})();