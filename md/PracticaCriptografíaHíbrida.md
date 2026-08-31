## INSTITUTO POLITÉCNICO NACIONAL ESCUELA SUPERIOR DE CÓMPUTO

La criptografía moderna, creada a partir de 1948 con la Teoría de la Información de Claude Shannon, se divide en simétrica y asimétrica, una de las principales diferencias, es que en esta última se utiliza la clave pública del destinatario del mensaje para cifrar el mensaje y el destinatario usa su clave privada para descifrarlo. Otra de las diferencias, es que la criptografía asimétrica puede proveer autenticidad, con lo que el destinatario puede corroborar la identidad del remitente. Sin embargo, se limita la cantidad de información a cifrar a diferencia de la criptografía simétrica que permite procesar información de cualquier tamaño ya que trabaja por bloques o por flujo, lamentablemente se presentan los problemas de distribución y almacenamiento de la llave.

No se puede decir cuál es mejor que otra, habrá que identificar claramente que servicios se pueden ofrecer con cada una de ellas y es posible mezclarlas para resolver los problemas que presentan de forma individual.

Algunos de los principales servicios criptográficos requeridos son

- Confidencialidad: protege la información ante revelaciones no autorizadas.

- Autenticación: verifica que un nodo o un usuario sea quien dice ser.

- Integridad: protege los datos del sistema ante modificaciones o alteraciones no deseadas.

- No repudio: impide que un emisor niegue haber enviado un mensaje o que un receptor niegue haberlo recibido.

Los algoritmos de criptografía simétrica ofrecen confidencialidad para archivos de cualquier tamaño, el uso de las funciones hash brinda integridad de la información y si se complementa con criptografía asimétrica se puede ofrecer autenticación y no repudio.

En la figura 1 se muestra un escenario haciendo uso de algoritmos criptográficos simétricos y asimétricos que permite ofrecer desde uno hasta todos los servicios anteriormente descritos.

Dra. Nidia A. Cortez Duarte


## INSTITUTO POLITÉCNICO NACIONAL ESCUELA SUPERIOR DE CÓMPUTO

Confidencialidad

Integridad de Datos

Autenticacién

No repudio

Criptografia NCD

*Dra. Nidia A. Cortez Duarte*


INSTITUTO POLITÉCNICO NACIONAL

Implementar el escenario de Criptografía Híbrida asignado.

Se puede hacer uso de funciones existentes, sin embargo, deberán estar bien referenciadas.

Debe contar con una interfaz gráfica que debe ofrecer un menú que permita

- Cifrado/Descifrado

- Firma/ Verificación

El usuario será capaz de seleccionar el proceso requerido de acuerdo a los servicios que necesite ofrecer. Uno de dos o dos de dos.

Dra. Nidia A. Cortez Duarte


## INSTITUTO POLITÉCNICO NACIONAL ESCUELA SUPERIOR DE CÓMPUTO

## Elaborar diapositivas

- Portada

- Introducción con el árbol de la clasificación de la criptografía moderna

- Diagrama de cifrado/descifrado con criptografía simetrica [Elaborar a computadora]

- Diagrama de cifrado/descifrado con criptografía asimetrica [Elaborar a computadora]

- Diagrama de Criptografía Híbrida asignado en caso de que su implementación quedará exactamente igual, si usted concatenó diferente los parametros deberá actualizar el diagrama.

- Demostración de práctica

- Conclusiones individuales

Deberán elaborar un video (duración máxima 17 min), en donde se muestre su escritorio

Primero proyectar sus diapositivas y empezar a explicar

En la mitad de la pantalla puede mostrar su código o las diapositivas y en la otra mitad de pantalla su interfaz gráfica. Durante toda su explicación se debe poder ver su vídeo en miniatura

Previamente deben tener sus llaves públicas en sus páginas web.

Pruebas que deben incluir en su video.

- A) Alicia cifra y firma mensaje para Betito y lo guarda en la nube (drive) Alicia mostrará su escritorio mientras va describiendo todo el proceso de cifrado y firma, especificando los servicios que se van ofreciendo en cada paso que realice.

- B) Candy cifra y firma mensaje para Betito y lo guarda en la nube (drive) Candy mostrará su escritorio mientras va describiendo todo el proceso de cifrado y firma, especificando los servicios que se van ofreciendo en cada paso que realice.

- C) Candy altera los archivos en la nube, duplica uno de los archivos, teniendo un total de 3 archivos en la nube y los renombra como x, y, z.

- D) Betito deberá indicar quien es el autor de cada archivo y mostrar el contenido. Betito mostrará su escritorio para describir todo el proceso de descifrado y verificación especificando los servicios que se van ofreciendo en cada paso que realice.

- E) Hacer que falle el servicio de Integridad [Candy] y Betito debe mostrar que falla la verificación

- F) Corregir para que vuelva a funcionar [Candy] y Betito debe mostrar que ahora si verificar bien.

- G) Finalmente dejar de compartir pantalla y decir sus conclusiones individuales finales.

Nota: cuando sea necesario utilizar alguna llave pública se debe descargar en ese momento de la página web.

Para esta práctica se evaluará tanto el funcionamiento a detalle de lo solicitado así como la explicación de todos los algoritmos y servicios criptográficos implementados, el manejo de las llaves y el envio de mensajes. Sugiero que elaboren su guión para ser precisos y no excedan los tiempos. Dejaré de revisar los vídeos después del minuto 17 por favor ni me pregunten si puede durar mas. Videos acelerados no los voy a ver.
