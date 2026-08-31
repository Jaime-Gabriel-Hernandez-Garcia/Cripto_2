# Práctica: Criptografía Híbrida

**Instituto Politécnico Nacional**  
**Escuela Superior de Cómputo (ESCOM)**  
**Materia:** Criptografía  
**Profesora:** Dra. Nidia A. Cortez Duarte  

---

## 🔐 1. Esquema Criptográfico Implementado

El sistema implementa de forma exacta el esquema híbrido asignado:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 DIFFIE - HELLMAN                        │
                  │  Para K:  Ka = g^a mod n  <--->  Kb = g^b mod n  => K   │
                  │  Para IV: Kc = g^c mod n  <--->  Kd = g^d mod n  => IV  │
                  └─────────────────────────┬───────────────────────────────┘
                                            │ (K_AES, IV_AES)
                                            ▼
[ Mensaje m ] ───► [ AES-256-CBC ] ──────────────────► [ Ciphertext ] ──┐
      │                                                                  ├─► Paquete Híbrido (.hyb)
      ▼                                                                  │   a la Nube (Drive)
[ Embudo SHA3-256 ] ──► [ Digest ] ──► [ RSA A_Privada ] ──► [ Firma ] ──┘
```

### Servicios Criptográficos Cubiertos:
1. **Confidencialidad:** Cifrado simétrico **AES-256-CBC** con clave ($K$) e Inicializador ($IV$) acordados mediante **Diffie-Hellman**.
2. **Integridad de Datos:** Resumen criptográfico del mensaje mediante función hash **SHA3-256**.
3. **Autenticación:** Firma digital del resumen con la **Llave Privada RSA** del emisor y verificación con su **Llave Pública RSA**.
4. **No Repudio:** La firma digital con llave privada vincula de forma irrefutable al autor con el mensaje transmitido.

---

## 🚀 2. Requisitos e Instalación

### Requisitos:
- Python 3.10 o superior
- Paquetes: `cryptography`, `customtkinter`, `requests`

### Instalación de dependencias:
```bash
pip install cryptography customtkinter requests
```

---

## 🖥️ 3. Ejecución del Sistema

Para iniciar la aplicación gráfica completa:
```bash
python gui_app.py
```

Al iniciar la aplicación:
- Se inicializan automáticamente las llaves RSA de **Alicia**, **Betito** y **Candy**.
- Se levanta un servidor HTTP local en `http://localhost:8080` que sirve las llaves públicas PEM y una página web responsiva.

---

## 🧪 4. Guía para la Demostración en Video (Máximo 17 min)

La interfaz incluye la pestaña **"3. Pruebas de Video (A - F)"** para facilitar cada paso durante la grabación:

| Paso | Acción en el Video | Explicación de Servicios |
|---|---|---|
| **A** | **Alicia** cifra y firma mensaje para **Betito**. Guarda en la nube. | Explicar: DH genera $K$ e $IV$, AES-CBC da *Confidencialidad*, SHA3 da *Integridad*, RSA privada da *Autenticación y No Repudio*. |
| **B** | **Candy** cifra y firma mensaje para **Betito**. Guarda en la nube. | Explicar el mismo proceso con la identidad y llaves de Candy. |
| **C** | **Candy** altera archivos en la nube y crea 3 archivos: `x.hyb`, `y.hyb`, `z.hyb`. | Mostrar la carpeta de la nube con los 3 archivos renombrados. |
| **D** | **Betito** inspecciona `x`, `y`, `z`, descarga las llaves públicas vía Web, identifica el autor real de cada uno y descifra el contenido. | Mostrar que la firma digital revela si el autor es Alicia o Candy. |
| **E** | **Candy** altera 1 bit en `x.hyb` (Fallo de Integridad) y Betito muestra la alerta de verificación fallida. | Explicar: Al alterar el mensaje/firma, el hash SHA3 calculado no coincide con la firma RSA $\rightarrow$ *Integridad Violada*. |
| **F** | **Candy** restaura el archivo y Betito verifica con éxito nuevamente. | Mostrar cómo los 4 semáforos de servicios vuelven a estar en verde $\checkmark$. |
| **G** | Dejar de compartir pantalla y presentar conclusiones individuales. | Reflexión sobre la combinación de criptografía simétrica y asimétrica. |

---

## 🌐 5. Servidor Web de Llaves Públicas

- **URL de Inicio:** `http://localhost:8080`
- **Llave Pública de Alicia:** `http://localhost:8080/keys/alicia_pub.pem`
- **Llave Pública de Betito:** `http://localhost:8080/keys/betito_pub.pem`
- **Llave Pública de Candy:** `http://localhost:8080/keys/candy_pub.pem`

*(El sistema también es compatible con URLs externas como GitHub Pages o Pastebin).*

---

## 🧪 6. Pruebas Automatizadas

Para validar todos los algoritmos criptográficos y flujos:
```bash
python test_suite.py
```
Resultado: **8/8 pruebas exitosas** ($\checkmark$).
