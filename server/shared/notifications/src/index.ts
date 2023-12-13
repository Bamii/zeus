import log from "logger";
import { EmailNotificationService } from "./impl/email";
import { SMSNotificationService } from "./impl/sms";

const NotificationServices = {
  "email": EmailNotificationService,
  "sms": SMSNotificationService
} as const;

export const CLIENT_QUEUE_JOIN = "CLIENT_QUEUE_JOIN";
export const CLIENT_QUEUE_LEAVE = "CLIENT_QUEUE_LEAVE";
export const MERCHANT_REGISTRATION_NOTIFICATION = "MERCHANT_REGISTRATION_NOTIFICATION";
export type NOTIFICATION_TYPES = typeof MERCHANT_REGISTRATION_NOTIFICATION 
  | typeof CLIENT_QUEUE_JOIN 
  | typeof CLIENT_QUEUE_LEAVE;


export abstract class NotificationService {
  constructor() { }
  abstract connect(): Promise<this>
  abstract registerUser(userid: string, contact: string): Promise<void>
  abstract sendNotification(notification: Omit<NotificationOptions, 'channel'>): Promise<void>
}

export type NotificationOptions = {
  destination: "broadcast" | string;
  type: NOTIFICATION_TYPES
  message: string
  channel: NotificationType;
  data: Record<any, any>
}
export type NotificationType = keyof typeof NotificationServices;
type NotificationServicesListType<Type> = { -readonly [Property in keyof Type]: Type[Property] }
type NotificationServicesListType1<Type> = { -readonly [Property in keyof Type]: NotificationService }

class Factory {
  data: NotificationServicesListType1<typeof NotificationServices>;

  constructor(values: NotificationServicesListType<typeof NotificationServices>) {
    this.data = {} as NotificationServicesListType1<typeof NotificationServices>
    for (let i of Object.keys(values)) {
      const idx = i as NotificationType;
      const Constructor = values[idx];
      this.data[idx] = new Constructor();
    }
  }

  getInstanceOfNotificationType = (type: NotificationType): NotificationService => {
    return this.data[type];
  }
}

const exporter = (function() {
  log.info("this is entering")
  let instance: Factory;
  return (): Factory => {
    if (!instance) instance = new Factory(NotificationServices);
    return instance;
  }
})();

export default exporter;

// const me = exporter();
// const email = me.getInstanceOfNotificationType("sms");

// email.sendNotification({
//   destination: "",
//   message: "hello"
// });
