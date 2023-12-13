import log from "logger";
import { Novu } from '@novu/node'; 
import { NotificationService, NotificationOptions } from '../'
// import _config from "config";
// const config = _config.notifications;

export class EmailNotificationService implements NotificationService {
  client: any;

  constructor() {
    this.connect();
  }

  async connect(): Promise<this> {
    try {
      this.client = new Novu('2bf4f35245b4dcc80706eb17dc8af34f');
      log.info('successfully connected to email service.');
    } catch (error: any) {
      log.error(error);
      log.error("error occured while connecting to email");
      throw error;
    }
    return this;
  }

  // contact is either an email or phone number
  async registerUser(userid: string, contact: string): Promise<void> {
    await this.client.subscribers.identify(userid, {
      email: contact
    });    
  }

  async sendNotification(notification: Omit<NotificationOptions, "channel">): Promise<void> {
    try {
      log.info(notification);
      await this.client.trigger(notification.type, {
        to: { subscriberId: notification.data.userid }
      });

      log.info("send email successfully")
    } catch (error: any) {
      log.info(error.message);
      throw error;
    }
  }
}

