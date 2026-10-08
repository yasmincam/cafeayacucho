import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  router = inject(Router);
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);

  cargando = true;
  toastMsg = '';
  tab = 'resumen';
  rolUsuario = 'cliente';
  
  usuario: any = {};
  historial: any[] = [];
  cupones: any[] = [];

  editNombre = ''; editEmail = ''; editPass = ''; editDni = ''; editTelefono = '';

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('usuario_cactus') || 'null');
    if (!user) { this.router.navigate(['/login']); return; }
    
    this.rolUsuario = user.rol || 'cliente';
    this.usuario = user; // Asigna el usuario inmediatamente para que no haya retraso
    const userId = user.id_usuario || user.idUsuario || user.id;
    this.cargarDatos(userId);
  }

  cargarDatos(id: number) {
    this.cargando = true;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token_cactus')}` };
    this.http.get<any>(`http://localhost:8080/api/perfil/cargar/${id}`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.usuario = res.usuario;
          this.usuario.datos_nivel = this.calcNivel(parseInt(this.usuario.visitas_presenciales) || 0);
          this.historial = res.historial;
          this.cupones = res.cupones;
          this.editNombre = this.usuario.nombre; this.editEmail = this.usuario.email;
          this.editDni = this.usuario.dni || ''; this.editTelefono = this.usuario.telefono || '';
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.toast('Error cargando perfil. Reintente más tarde.');
      }
    });
  }

  calcNivel(v: number) {
    const niveles = [
      { min: 68, n: 5, pct: 15, meta: 25, txt: '¡Máximo Nivel Alcanzado!' },
      { min: 43, n: 4, pct: 10, meta: 25, txt: 'Próximo: Nivel 5 (15% Desc.)' },
      { min: 23, n: 3, pct: 7, meta: 20, txt: 'Próximo: Nivel 4 (10% Desc.)' },
      { min: 11, n: 2, pct: 5, meta: 12, txt: 'Próximo: Nivel 3 (7% Desc.)' },
      { min: 3, n: 1, pct: 2, meta: 8, txt: 'Próximo: Nivel 2 (5% Desc.)' },
      { min: 0, n: 0, pct: 0, meta: 3, txt: 'Próximo: Nivel 1 (2% Desc.)' }
    ];
    const lvl = niveles.find(l => v >= l.min) || niveles[5];
    const baseV = lvl.n === 5 ? v : v - lvl.min;
    return { 
      nivel: lvl.n, 
      progreso: lvl.n === 5 ? 100 : (baseV / lvl.meta) * 100, 
      visitasNivelActual: lvl.n === 5 ? 25 : baseV, 
      metaNivel: lvl.meta, 
      textoNext: lvl.txt,
      pctActual: lvl.pct
    };
  }

  actualizarPerfil(e: Event) {
    e.preventDefault();
    this.cargando = true;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token_cactus')}` };
    const payload = { id_usuario: this.usuario.id_usuario, nombre: this.editNombre, email: this.editEmail, password: this.editPass, dni: this.editDni, telefono: this.editTelefono };
    
    this.http.post<any>('http://localhost:8080/api/perfil/actualizar', payload, { headers }).subscribe(res => {
      this.toast(res.mensaje);
      if (res.success) {
        const local = JSON.parse(localStorage.getItem('usuario_cactus')!);
        Object.assign(local, { nombre: this.editNombre, email: this.editEmail, dni: this.editDni, telefono: this.editTelefono });
        localStorage.setItem('usuario_cactus', JSON.stringify(local));
        this.editPass = '';
        this.cargarDatos(this.usuario.id_usuario);
      } else {
        this.cargando = false;
      }
    });
  }

  irPanel() { this.router.navigate([this.rolUsuario === 'admin' ? '/admin/panel' : '/empleado/dashboard']); }
  irTienda() { this.router.navigate(['/']); }
  cerrarSesion() { localStorage.removeItem('usuario_cactus'); this.router.navigate(['/login']); }
  toast(msg: string) { this.toastMsg = msg; setTimeout(() => { this.toastMsg = ''; this.cdr.detectChanges(); }, 3500); }
}