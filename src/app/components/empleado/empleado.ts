import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleado.html',
  styleUrl: './empleado.css'
})
export class Empleado implements OnInit {
  router = inject(Router); 
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  
  empleado: any; 
  tab = 'ordenes'; 
  cargando = true;
  toast = '';
  modal = '';

  ordenes: any[] = []; 
  sugerencias: any[] = []; 
  inventario: any[] = [];
  dni = ''; 

  ngOnInit() {
    this.empleado = JSON.parse(localStorage.getItem('usuario_cactus') || 'null');
    if (!this.empleado || (this.empleado.rol !== 'empleado' && this.empleado.rol !== 'admin')) { this.router.navigate(['/']); return; }
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    const empId = this.empleado.id_usuario || this.empleado.idUsuario || this.empleado.id;
    this.http.get<any>(`http://localhost:8080/api/empleado/dashboard/${empId}`).subscribe({
      next: res => { 
        this.ordenes = res.ordenesActivas || []; 
        this.inventario = res.inventario || [];
        this.cargando = false; 
        this.cdr.detectChanges(); 
      },
      error: () => { this.cargando = false; this.mostrarToast('Error cargando datos'); }
    });
  }

  mostrarToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; this.cdr.detectChanges(); }, 3500);
  }

  accionRemota(end: string, payload: any) {
    payload.id_empleado = this.empleado.id_usuario;
    this.cargando = true;
    this.http.post<any>(`http://localhost/cactus-api/${end}`, payload).subscribe(res => {
      this.mostrarToast(res.mensaje || 'Acción exitosa'); 
      this.cargarDatos(); 
      this.modal='';
      this.cargando = false;
    });
  }

  ordAction(id: number, ac: string, usr: number = 0) {
    if(confirm('¿Confirmar acción: ' + ac.toUpperCase() + '?')) {
      this.accionRemota('ordenes_api.php', {accion: ac, id_reserva: id, id_usuario: usr});
    }
  }

  buscarC(e: Event) {
    const val = (e.target as HTMLInputElement).value; 
    this.dni = val;
    if(val.length < 2) { this.sugerencias = []; return; }
    this.http.post<any>('http://localhost/cactus-api/ordenes_api.php', {accion: 'buscar_clientes', termino: val})
      .subscribe(r => this.sugerencias = r.clientes || []);
  }

  visita(id: number) { 
    this.accionRemota('ordenes_api.php', {accion: 'registrar_visita', id_cliente: id}); 
    this.sugerencias = []; 
    this.dni = ''; 
  }

  guardarProd(e: Event) {
    e.preventDefault(); 
    const fd = new FormData(e.target as HTMLFormElement);
    fd.append('accion','guardar_producto'); 
    fd.append('id_empleado', this.empleado.id_usuario.toString());
    this.http.post<any>('http://localhost/cactus-api/inventario_api.php', fd).subscribe(r => { 
      this.mostrarToast(r.mensaje); 
      this.modal=''; 
    });
  }

  abrirPdf(id: number) { window.open(`http://localhost/cactus-api/generar_comprobante.php?id=${id}`, '_blank'); }
  ir(r: string) { this.router.navigate([r]); }
  salir() { localStorage.removeItem('usuario_cactus'); this.ir('/login'); }
}
