import { Injectable } from '@nestjs/common';
import { Message } from '@custom/api-interfaces';

const UssdMenu = require('ussd-menu-builder');
const menu = new UssdMenu();

@Injectable()
export class AppService {
  constructor() {
    this.generateForms();
  }

  getMenu(): any {
    return menu;
  }

  async runUSSD(args) {
    let resp = await menu.run(args);
    return resp;
  }

  generateForms() {
    menu.startState({
      run: function () {
        menu.con('Choose Option' +
          '\n1. Screen Patient' +
          '\n2. Subscribe Alerts' +
          '\n3. Emergency'
        );
      },
      next: {
        '1': 'screenPatient',
        '2': 'subscribe',
        '3': 'emergency'
      },
      defaultNext: 'invalidOption'
    })
    .state('screenPatient', {
      run: function () {
        menu.con("Enter patient's name");
      },
      next: {
        '*[a-zA-Z]+': 'screenPatient.fever'
      },
      defaultNext: 'invalidOption'
    })
    .state('screenPatient.fever', {
      run: function () {
        menu.con("Fever in the last 2 weeks?" +
          '\n1. Yes' +
          '\n2. No'
        );
      },
      next: {
        '*[1-2]+': 'screenPatient.cough'
      },
      defaultNext: 'invalidOption'
    })
    .state('screenPatient.cough', {
      run: function () {
        menu.con("Dry cough" +
          '\n1. Mild' +
          '\n2. Severe' +
          '\n3. None'
        );
      },
      next: {
        '*[1-3]+': 'screenPatient.breathing'
      },
      defaultNext: 'invalidOption'
    })
    .state('screenPatient.breathing', {
      run: function () {
        menu.con("Breathing difficulty" +
          '\n1. Shortness of breathe' +
          '\n2. None'
        );
      },
      next: {
        '*[1-3]+': 'screenPatient.complete'
      },
      defaultNext: 'invalidOption'
    })
    .state('screenPatient.complete', {
      run: function () {
        menu.end("Thank you. Relevant authorities will act on it");
      }
    })
    .state('invalidOption', {
      run: function () {
        menu.end("Sorry, Invalid option. Try again later");
      }
    });
  }
}
