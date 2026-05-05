package examenFinalOrdinarioEj1.entidades;

public class Vehiculo {
	
private long id;
	
private string matricula;
	private String marca;
	private String modelo;
	private String anyo;
	
	public long getId() {
		return id;
	}
	public void setId(long id) {
		this.id = id;
	}
	public String getMarca() {
		return marca;
	}
	public void setMarca(String marca) {
		this.marca = marca;
	}
	public String getModelo() {
		return modelo;
	}
	public void setModelo(String modelo) {
		this.modelo = modelo;
	}
	public String getAnyo() {
		return anyo;
	}
	public void setAnyo(String anyo) {
		this.anyo = anyo;
	}
	public Vehiculo(String marca, String modelo, String anyo) {
		super();
		this.marca = marca;
		this.modelo = modelo;
		this.anyo = anyo;
	}
	@Override
	public String toString() {
		return "Vehiculo [id=" + id + ", marca=" + marca + ", modelo=" + modelo + ", anyo=" + anyo + "]";
	}
	
}
