import { Controller, Post, Body } from "@nestjs/common";
import { NatsService } from "./nats.service";

@Controller("nats")
export class NatsController {
  constructor(private readonly natsService: NatsService) {}

  @Post("publish-stream") // JETSTREAM Example
  async subscribeStream(@Body() data: any) {
    try {
      await this.natsService.publishStream("mystream1.a", data);
      return "stream published";
    } catch (error) {
      throw error;
    }
  }

  @Post("publish") // PUB - SUB Example
  async publishData(@Body() data: any): Promise<string> {
    try {
      this.natsService.publish("mystream", data);
      return "data published successfully.";
    } catch (error) {
      throw error;
    }
  }

  @Post("request") // Request - Response Example
  async requestData(): Promise<string> {
    try {
      return await this.natsService.requestResponse();
    } catch (error) {
      throw error;
    }
  }
}
