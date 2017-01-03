/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var db = null;
var app = {
	// Application Constructor
	initialize: function() {
		this.bindEvents();
	},
	// Bind Event Listeners
	//
	// Bind any events that are required on startup. Common events are:
	// 'load', 'deviceready', 'offline', and 'online'.
	bindEvents: function() {
		document.addEventListener('deviceready', this.onDeviceReady, false);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicitly call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		//Esto es para web
		
		try{
			//db = openDatabase({name: "tracking.db"});
			db = window.sqlitePlugin.openDatabase({name: 'libretainventario.db', location: 1, androidDatabaseImplementation: 2});
			console.log("Conexión desde phonegap OK");
			crearBD(db);
		}catch(err){
			alertify.error("No se pudo crear la base de datos con sqlite... se intentará trabajar con web");
			db = window.openDatabase("libretainventario.db", "1.0", "Just a Dummy DB", 200000);
			crearBD(db);
			console.log("Se inicio la conexión a la base para web");
		}
        
		$("[vista=addProducto]").hide();
        
		$("#btnAddProducto").click(function(){
			$("[vista=addProducto]").show();
			$("[vista=home]").hide();
			
			$("#getTiendas").hide();
			$("#lstImg").find("img").remove();
			
			$("#btnSave").prop("disabled", false);
		});
        
		$("#backToHome").click(function(){
			$("[vista=addProducto]").hide();
			$("[vista=home]").show();
			getShowCodigosPendientes();
		});
		
		$("[action=getCode]").click(function(){
			cordova.plugins.barcodeScanner.scan(function(result){
				$("#txtCodigo").val(result.text);
			},function(error){
				alertify.error("Ocurrió un error al leer el código");
			});
		});
		
		getShowCodigosPendientes();
		
		$("[action=getImagen]").click(function(){
			if ($("#txtCodigo").val() == '')
				alertify.error("Primero escanea el código");
			else if ($("#lstImg").find("img").length < 1){
				navigator.camera.getPicture(function(imageURI){
					var img = $("<img />");
									
					$("#lstImg").append(img);
					img.attr("src", "data:image/jpeg;base64," + imageURI);
					img.attr("src2", imageURI);
				}, function(message){
					alertify.error("Ocurrio un error al subir la imagen");
				}, { 
					quality: 100,
					//destinationType: Camera.DestinationType.FILE_URI,
					destinationType: Camera.DestinationType.DATA_URL,
					encodingType: Camera.EncodingType.JPEG,
					targetWidth: 250,
					targetHeight: 250,
					correctOrientation: true,
					allowEdit: false
				});
			}else
				alertify.error("Solo permiten 1 imagen por código");
		});
		
		$("#btnSave").click(function(){
			if($("#txtCodigo").val() == ''){
				alertify.error("Escanea el código");
			}else if($("#txtDescripcion").val() == ''){
				alertify.error("Falta la descripción");
			}else if($("#txtPrecio").val() == ''){
				alertify.error("Falta el precio");
			}else{
				var fotos = new Array();
				fotos[1] = "";
				
				$("#lstImg").find("img").each(function(i){
					fotos[i + 1] = $(this).attr("src2");
				});
				
				db.transaction(function(tx){
					tx.executeSql("delete from producto where codigo = ?", [$("#txtCodigo").val()], function(tx, res){
						var tel = window.localStorage.getItem("telefono");
						console.log(tel);
						$("#btnSave").prop("disabled", true);
						tx.executeSql("INSERT INTO producto (codigo, descripcion, precio, foto1) VALUES (?,?,?,?)", [
								$("#txtCodigo").val(), 
								$("#txtDescripcion").val(), 
								$("#txtPrecio").val(),
								fotos[1]
							], function(tx, res) {
								console.log("Código guardado");
								alertify.success("Código almacenado");
								
								$("#btnSave").prop("disabled", false);
							}, errorDB);
							
							$("#lstImg").find("img").remove();
							$("form").find("input").val("");
					}, errorDB);
				});
			}
		});
		
		$("[action=enviarAll]").click(function(){
		
			if (navigator.connection.type == Connection.NONE)
				alertify.error("Se necesita conexión a internet para enviar los datos... el envío fue detenido");
			else{
				var btn = $(this);
				btn.addClass("fa-spin");
				db.transaction(function(tx) {
					tx.executeSql("select * from codigo", [], function(tx, results){
						var total = 0;
						var band = 0;
						
						if (results.rows.length > 0){
							alertify.log("Enviando datos");
							for(cont = 0 ; cont < results.rows.length ; cont++){
								el = results.rows.item(cont);
								band++;
								
								var formData = new FormData();
								formData.append("photo1", el.foto1);
								formData.append("descripcion", el.descripcion);

								formData.append("codigo", el.codigo);
								formData.append("precio", el.precio);
								formData.append("movil", 1);
								formData.append("action", "add");
								formData.append("almacen", 1);
								
								$.ajax({
									url: 'http://10.0.0.5/libretasventasapp/cproductos',
									data: formData,
									contentType: false,
									processData: false,
									type: 'POST',
									success: function(data){
										total++;
										console.log(data.code);
										band--;
										
										if (band == 0){
											alertify.success("Se enviaron " + total + " códigos");
											btn.removeClass("fa-spin");
											db.transaction(function(tx) {
												tx.executeSql("delete from producto", []);
											});
											getShowCodigosPendientes();
										}
									}
								});
							}
						}else{
							alertify.log("No hay códigos para enviar");
							btn.removeClass("fa-spin");
						}
					}, errorDB);
				});
			}
		});
	}
};

//app.initialize();

$(document).ready(function(){
	app.onDeviceReady();
});

function getCodigosPendientes(fn){
	if (fn.before != undefined) fn.before();
	db.transaction(function(tx) {
		tx.executeSql("select * from producto", [], function(tx, results){
			if (fn.after != undefined) fn.after(results.rows);
		}, errorDB);
	});
}

function getShowCodigosPendientes(){
	getCodigosPendientes({
		before: function(){
			$("#dvHistorial").html('<i class="fa fa-refresh fa-spin fa-3x fa-fw"></i><span class="sr-only">Loading...</span>');
		},
		after: function(rows){
			$("#dvHistorial").html("");
			console.log("Registros código recuperados: " + rows.length);
			for(cont = 0 ; cont < rows.length ; cont++){
				el = rows.item(cont);
				$("#dvHistorial").append($('<a href="#" class="list-group-item"><h4 class="list-group-item-heading">' + el.codigo + '</h4><p class="list-group-item-text">' + el.descripcion + '</p></a>'));
			}
		}
	});
	
}