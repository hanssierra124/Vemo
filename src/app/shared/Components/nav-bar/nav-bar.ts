import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterModule], // <--- Verifica que esto esté aquí
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {}