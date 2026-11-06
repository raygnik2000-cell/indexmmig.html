/**
 * Crea una orden de pago y devuelve el enlace de redirección.
 * @param {string} emailUsuario - Correo del comprador.
 * @param {string} idCurso - Identificador o título del curso.
 * @param {number} monto - Valor a pagar en centavos o moneda base.
 * @return {string} URL del enlace de pago generado.
 */
function crearPago(emailUsuario, idCurso, monto) {
  try {
    // 1. Recuperar la clave secreta de forma segura desde las propiedades del script
    const scriptProperties = PropertiesService.getScriptProperties();
    const claveSecreta = scriptProperties.getProperty('CLAVE_SECRETA');
    
    if (!claveSecreta) {
      throw new Error("La clave secreta no está configurada en las propiedades del script.");
    }

    // 2. Construir la referencia única combinando usuario + curso + timestamp
    // Reemplazamos caracteres especiales para evitar errores en la URL
    const usuarioLimpio = emailUsuario.replace(/[^a-zA-Z0-9]/g, "_");
    const cursoLimpio = idCurso.replace(/[^a-zA-Z0-9]/g, "_");
    const referenciaUnica = `LCM_${usuarioLimpio}_${cursoLimpio}_${Date.now()}`;

    // 3. Definir las páginas de regreso (Redirect URLs)
    // Puedes cambiarlas por las URLs finales de tu sitio web desplegado
    const urlExito = "https://tudominio.com/pago-exitoso.html";
    const urlFallo = "https://tudominio.com/pago-fallido.html";

    // 4. Configurar los datos (payload) que enviará la API de la pasarela
    const payload = {
      reference: referenciaUnica,
      amount_in_cents: monto * 100, // Ejemplo: convertir a centavos si la pasarela lo requiere
      currency: "COP",
      customer_email: emailUsuario,
      redirect_url: urlExito,
      // Otras configuraciones específicas de tu pasarela...
    };

    // 5. Configurar las opciones de la petición HTTP
    const opciones = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + claveSecreta
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true // Permite capturar errores de la API detalladamente
    };

    // URL de ejemplo de la pasarela de pagos (cambiar por la oficial del proveedor)
    const endpointPasarela = "https://api.pasareladepagos.com/v1/transactions";

    // 6. Realizar la petición web
    const respuesta = UrlFetchApp.fetch(endpointPasarela, opciones);
    const resultado = JSON.parse(respuesta.getContentText());

    if (respuesta.getResponseCode() === 200 || respuesta.getResponseCode() === 201) {
      // Retornar el enlace de pago devuelto por la pasarela
      return {
        success: true,
        enlacePago: resultado.data.payment_link || resultado.data.redirect_url,
        referencia: referenciaUnica
      };
    } else {
      throw new Error("Error en la pasarela: " + (resultado.message || respuesta.getContentText()));
    }

  } catch (error) {
    Logger.log("Error en crearPago: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
function doPost(e) {
  try {
    // Recibir los datos enviados desde la web
    const datos = JSON.parse(e.postData.contents);
    const email = datos.email;
    const curso = datos.curso;
    const monto = datos.monto;

    // Llamar a tu función crearPago existente
    const resultadoPago = crearPago(email, curso, monto);

    // Responder en formato JSON a la página web
    return ContentService.createTextOutput(JSON.stringify(resultadoPago))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
