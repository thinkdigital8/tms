import { Notification } from '../../models/Notification';
import { NotificationChannel, NotificationType } from '../../common/types/enums';
import { emitNotification } from '../../sockets';

export interface SendNotificationInput {
  recipient: string;
  tournament?: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  payload?: Record<string, unknown>;
}

/**
 * Fan-out to every requested channel. Email/SMS/WhatsApp/Push delivery is a
 * pluggable adapter boundary — swap the `dispatchToProvider` stub for real
 * SMTP/Twilio/WhatsApp Business API/FCM calls without touching callers.
 * In-app notifications are always created so the notification bell/feed
 * works even with no external providers configured.
 */
export async function sendNotification(input: SendNotificationInput) {
  const channels = input.channels?.length ? input.channels : [NotificationChannel.IN_APP];

  const docs = await Promise.all(
    channels.map((channel) =>
      Notification.create({
        recipient: input.recipient,
        tournament: input.tournament,
        type: input.type,
        channel,
        title: input.title,
        message: input.message,
        payload: input.payload,
        status: 'pending',
      })
    )
  );

  for (const doc of docs) {
    try {
      await dispatchToProvider(doc.channel, input);
      doc.status = 'sent';
      doc.sentAt = new Date();
    } catch (err) {
      doc.status = 'failed';
      doc.error = err instanceof Error ? err.message : 'Unknown error';
    }
    await doc.save();
  }

  emitNotification(input.recipient, { type: input.type, title: input.title, message: input.message });
  return docs;
}

async function dispatchToProvider(channel: NotificationChannel, input: SendNotificationInput): Promise<void> {
  switch (channel) {
    case NotificationChannel.IN_APP:
      return; // no external call needed
    case NotificationChannel.EMAIL:
    case NotificationChannel.SMS:
    case NotificationChannel.WHATSAPP:
    case NotificationChannel.PUSH:
      // TODO: wire SMTP / Twilio / WhatsApp Business API / FCM using env vars
      // in config/env.ts. Left as a no-op so the rest of the notification
      // pipeline (persistence, in-app feed, sockets) works out of the box.
      return;
    default:
      return;
  }
}

export async function markRead(notificationId: string, userId: string) {
  await Notification.updateOne({ _id: notificationId, recipient: userId }, { status: 'read', readAt: new Date() });
}
