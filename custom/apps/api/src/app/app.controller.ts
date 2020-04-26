import { Controller, Get, Post, Body } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('hello')
  getData() {
    return 'Hello world'
  }

  @Post('ussd')
  postData(@Body() body) {
    let args = {
      phoneNumber: body.phoneNumber,
      sessionId: body.sessionId,
      serviceCode: body.serviceCode,
      text: body.text
    };
    console.log(args)

    let resp = this.appService.runUSSD(args);
    console.log(resp)
    return resp;
  }
}
