package examenFinalOrdinarioEj1.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import javax.sql.DataSource;

import examenFinalOrdinarioEj1.entidades.Vehiculo;

public class VehiculoDAOImplementacion implements VehiculoDAO {
	
	private DataSource ds;
	
	private static VehiculoDAOImplementacion instancia;
	
	public VehiculoDAOImplementacion (DataSource ds) {
		super();
		this.ds = ds;
	}
	
	public static VehiculoDAOImplementacion getInstance (DataSource ds) {
		if (instancia == null) {
			instancia = new VehiculoDAOImplementacion(ds);
		}
		return instancia;
		
		
	}
	
	public void insertarVehiculo (Vehiculo v) {
		String sql = "INSERT INTO vehiculo (Matricula, Marca, Modelo, Anyo) VALUES (?,?,?,?)";
		
		try {
			Connection con = ds.getConnection();
			PreparedStatement ps = con.prepareStatement(sql);
			
			ps.setString(1, v.);
		}
	}

}
