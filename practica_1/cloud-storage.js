/**
 * CloudStorage - Almacenamiento simulado de la Nube (Drive) con sincronización en tiempo real
 * entre pestañas mediante BroadcastChannel y persistencia en localStorage.
 */
class CloudStorage {
  constructor() {
    this.STORAGE_KEY = 'cripto_hibrida_drive_files';
    this.channel = typeof BroadcastChannel !== 'undefined' 
      ? new BroadcastChannel('cripto_hibrida_channel') 
      : null;
    this.listeners = [];

    if (this.channel) {
      this.channel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };
    }

    // Escuchar también storage events para navegadores que lo requieran
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        this.notifyListeners({ type: 'SYNC', files: this.getAllFiles() });
      }
    });
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => {
      try { cb(data); } catch(e) {}
    });
  }

  onSync(callback) {
    this.listeners.push(callback);
  }

  broadcast(message) {
    if (this.channel) {
      this.channel.postMessage(message);
    }
    this.notifyListeners(message);
  }

  getAllFiles() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveFilesMap(map) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(map));
  }

  /**
   * Guarda o actualiza un archivo en la nube
   */
  uploadFile(filename, packageData) {
    const files = this.getAllFiles();
    files[filename] = {
      filename,
      package: packageData,
      author: packageData.metadata.claimedAuthor || 'Desconocido',
      uploadedAt: new Date().toISOString(),
      isTampered: false,
      originalBackup: null
    };
    this.saveFilesMap(files);
    this.broadcast({ type: 'FILE_UPLOADED', filename, file: files[filename] });
    return files[filename];
  }

  getFile(filename) {
    const files = this.getAllFiles();
    return files[filename] || null;
  }

  /**
   * Duplica un archivo en la nube con un nuevo nombre (Inciso C de la práctica)
   */
  duplicateFile(sourceName, newName) {
    const files = this.getAllFiles();
    const source = files[sourceName];
    if (!source) throw new Error(`Archivo no encontrado: ${sourceName}`);

    files[newName] = {
      filename: newName,
      package: JSON.parse(JSON.stringify(source.package)),
      author: source.author,
      uploadedAt: new Date().toISOString(),
      isTampered: source.isTampered,
      isDuplicated: true,
      duplicatedFrom: sourceName
    };
    this.saveFilesMap(files);
    this.broadcast({ type: 'FILE_DUPLICATED', sourceName, newName, file: files[newName] });
    return files[newName];
  }

  /**
   * Renombra un archivo en la nube (Inciso C: renombrar a x, y, z)
   */
  renameFile(oldName, newName) {
    const files = this.getAllFiles();
    const item = files[oldName];
    if (!item) throw new Error(`Archivo no encontrado: ${oldName}`);

    delete files[oldName];
    item.filename = newName;
    files[newName] = item;

    this.saveFilesMap(files);
    this.broadcast({ type: 'FILE_RENAMED', oldName, newName, file: item });
    return item;
  }

  /**
   * Altera / corrompe deliberadamente el archivo para hacer fallar la Integridad (Inciso E)
   */
  tamperFile(filename) {
    const files = this.getAllFiles();
    const item = files[filename];
    if (!item) throw new Error(`Archivo no encontrado: ${filename}`);

    if (item.isTampered) return item; // Ya estaba alterado

    // Guardar copia de seguridad del original para poder restaurarlo en el Inciso F
    item.originalBackup = JSON.parse(JSON.stringify(item.package));
    item.isTampered = true;

    // Invertir un byte en el payload (criptograma) o en el texto
    if (item.package.content && item.package.content.payload) {
      const payload = item.package.content.payload;
      if (payload.length > 4) {
        // Alterar un carácter hexadecimal
        const lastChar = payload.slice(-1);
        const replacedChar = lastChar === 'A' ? 'F' : 'A';
        item.package.content.payload = payload.slice(0, -1) + replacedChar;
      }
    }

    this.saveFilesMap(files);
    this.broadcast({ type: 'FILE_TAMPERED', filename, file: item });
    return item;
  }

  /**
   * Corrige / restaura el archivo alterado para que vuelva a verificar bien (Inciso F)
   */
  repairFile(filename) {
    const files = this.getAllFiles();
    const item = files[filename];
    if (!item) throw new Error(`Archivo no encontrado: ${filename}`);

    if (!item.isTampered || !item.originalBackup) return item;

    item.package = JSON.parse(JSON.stringify(item.originalBackup));
    item.isTampered = false;
    item.originalBackup = null;

    this.saveFilesMap(files);
    this.broadcast({ type: 'FILE_REPAIRED', filename, file: item });
    return item;
  }

  /**
   * Elimina un archivo
   */
  deleteFile(filename) {
    const files = this.getAllFiles();
    delete files[filename];
    this.saveFilesMap(files);
    this.broadcast({ type: 'FILE_DELETED', filename });
  }

  /**
   * Limpia toda la nube
   */
  clearDrive() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.broadcast({ type: 'DRIVE_CLEARED' });
  }

  /**
   * Descarga un archivo a disco como .json
   */
  downloadFileAsJson(filename) {
    const file = this.getFile(filename);
    if (!file) return;
    const blob = new Blob([JSON.stringify(file.package, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.CloudStorage = CloudStorage;
