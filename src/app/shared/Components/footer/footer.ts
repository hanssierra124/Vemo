import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  constructor(private router: Router) {}

  /**
   * Abre el chat de Vela. Como el dock vive dentro de HomeComponent,
   * navegamos a /home con un query param que esa vista detecta para
   * disparar abrirChatDirecto() apenas se monte.
   */
  openVelaChat() {
    this.router.navigate(['/home'], { queryParams: { openChat: '1' } });
  }
}
