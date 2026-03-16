export class Invoice {
    
    constructor (id_company, id_cliente, clienteNombre, clienteNif, clienteDireccion, fecha, tipo, numero, total, estado, formaPago, observaciones) {
        this.id_company = id_company;
        this.id_cliente = id_cliente;
        this.clienteNombre = clienteNombre;
        this.clienteNif = clienteNif;
        this.clienteDireccion = clienteDireccion;
        this.fecha = fecha;
        this.tipo = tipo;
        this.numero = numero;
        this.total = total;
        this.estado = estado;
        this.formaPago = formaPago;
        this.observaciones = observaciones;
    }
}