import { NotificationService, NotificationOptions } from "../"
import { Novu } from '@novu/node'; 
// import Mailjet from "node-mailjet";
import log from "logger"

export class SMSNotificationService implements NotificationService {
  client: any;

  constructor() {
    this.connect();
  }

  async connect(): Promise<this> {
    // const api_token = process.env.API_TOKEN ?? "";

    // log.info(api_token)
    // this.client = Mailjet.smsConnect(
    //   api_token,
    //   {
    //     config: {},
    //     options: {}
    //   }
    // );
    this.client = new Novu('2bf4f35245b4dcc80706eb17dc8af34f');
    return this;
  }

  async registerUser(userid: string, contact: string): Promise<void> {
    log.info(userid, contact);
    // await this.client.subscribers.identify(userid, {
    //   phone: contact
    // }); 
  }

  async sendNotification(notification: NotificationOptions): Promise<void> {
    try {
      log.info(notification);
      await this.client.trigger('sms', {
        to: { subscriberId: 'fnu834h8fuh8r', phone: "+2348077847671" },
        payload: {}
      });

      log.info("send email successfully")
    } catch (error: any) {
      log.info(error.message);
      throw error;
    }
  }
}


