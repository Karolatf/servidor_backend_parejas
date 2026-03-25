// MÓDULO: models/userModel.js
// CAPA: Modelo (datos y operaciones sobre los datos)

// Responsabilidad única: manejar la fuente de datos de usuarios.
// NUNCA conoce req, res ni Express.
// Solo recibe valores, opera sobre el arreglo y retorna resultados.

// Arreglo que simula la base de datos en memoria
// id: número consecutivo — NO es el documento de identidad
// documento: número de documento de identidad (campo separado)
let usuarios = [
    { id: 1, documento: '1097497001', name: 'Paulo',     email: 'paulo@sena.edu.co' },
    { id: 2, documento: '1097497002', name: 'Sebastian', email: 'sebastian@sena.edu.co' },
    { id: 3, documento: '1097497003', name: 'Karol',     email: 'karol@sena.edu.co' }
];

// Contador para el próximo id automático
// Empieza en 4 porque ya hay 3 usuarios en el arreglo inicial
let contadorId = 4;

// Retorna una copia del arreglo completo de usuarios
// slice() evita que quien llame pueda modificar el arreglo original desde afuera
export function getAllUsers() {
    return usuarios.slice();
}

// Busca un usuario por su id numérico
// Parámetro: id — puede llegar como string desde req.params, se convierte a número
// Retorna el objeto usuario o undefined si no existe
export function getUserById(id) {
    return usuarios.find(u => u.id === Number(id));
}

// Busca un usuario por su número de documento de identidad
// Parámetro: documento — el número de documento como string o número
// Retorna el objeto usuario o undefined si no existe
export function getUserByDocumento(documento) {
    return usuarios.find(u => u.documento.toString() === documento.toString());
}

// Crea un usuario nuevo y lo agrega al arreglo
// Parámetro: objeto con { documento, name, email }
// IMPORTANTE: Karol envía exactamente { documento, name, email } desde crearUsuario()
// Retorna el usuario creado con su id asignado
export function createUser({ documento, name, email }) {
    // Se construye el objeto con el id consecutivo y los campos recibidos
    const nuevoUsuario = {
        id: contadorId,
        documento,
        name,
        email
    };

    // Se incrementa el contador para el próximo usuario
    contadorId++;

    // Se agrega al arreglo en memoria
    usuarios.push(nuevoUsuario);

    // Se retorna el objeto para que el controlador lo envíe en la respuesta
    return nuevoUsuario;
}

// Actualiza los campos de un usuario existente
// Parámetros: id, campos (objeto parcial con los campos a cambiar)
// Retorna el usuario actualizado, o null si no existe
export function updateUser(id, campos) {
    const indice = usuarios.findIndex(u => u.id === Number(id));

    // Si no se encontró se retorna null para que el controlador responda 404
    if (indice === -1) return null;

    // El spread preserva los campos que no vienen en la actualización
    usuarios[indice] = { ...usuarios[indice], ...campos };
    return usuarios[indice];
}

// Elimina un usuario del arreglo por su id
// Retorna el usuario eliminado, o null si no existía
export function deleteUser(id) {
    const indice = usuarios.findIndex(u => u.id === Number(id));
    if (indice === -1) return null;

    // splice elimina 1 elemento y retorna un arreglo; [0] extrae el elemento
    const [usuarioEliminado] = usuarios.splice(indice, 1);
    return usuarioEliminado;
}