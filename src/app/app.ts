import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormFeedbackOutlet } from './shared/form-feedback';

@Component({
  imports: [RouterOutlet, FormFeedbackOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
