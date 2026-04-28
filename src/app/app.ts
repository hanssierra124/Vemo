import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './shared/Components/nav-bar/nav-bar';
import { Footer } from './shared/Components/footer/footer';
// Fíjate: Ya NO importamos Leaflet aquí

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'vemo';
  // ¡LISTO! Aquí borramos ngOnInit y initMap.
  // Ahora este archivo solo sirve de "contenedor" principal.
}
