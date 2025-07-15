import mongoose, { Schema, Document } from 'mongoose';

interface INotification extends Document {
  userId: mongoose.Types.ObjectId;      // Receiver of the notification
  title: string;                        // Short title (e.g., "New Message")
  body: string;                         // Message body (e.g., "John commented on your post")
  type: 'info' | 'success' | 'warning' | 'error' | 'custom';
  data?: Record<string, any>;           // Extra data (e.g., IDs to navigate)
  isRead: boolean;                      // Mark if notification was read
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationModel extends mongoose.Model<INotification> {
  createNotification(userId: mongoose.Types.ObjectId, title: string, body: string, type?: 'info' | 'success' | 'warning' | 'error' | 'custom', data?: Record<string, any>): Promise<INotification>;
  getNotifications(userId: mongoose.Types.ObjectId,): Promise<INotification[]>;
  markAsRead(notificationId: string): Promise<void>;
}


const notificationSchema: Schema = new Schema<INotification>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'custom'],
      default: 'info',
    },
    data: {
      type: Schema.Types.Mixed, // we can store any object here
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

notificationSchema.statics.createNotification = async function (
  userId: mongoose.Types.ObjectId,
  title: string,
  body: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'custom' = 'info',
  data: Record<string, any> = {}
): Promise<INotification> {
  const notification = new this({
    userId,
    title,
    body,
    type,
    data
  });
  return await notification.save();
};

notificationSchema.statics.getNotifications = async function (userId: mongoose.Types.ObjectId): Promise<INotification[]> {
  return await this.find({ userId }).sort({ createdAt: -1 });
};
notificationSchema.statics.markAsRead = async function (notificationId: string): Promise<void> {
  await this.updateOne({ _id: notificationId }, { $set: { isRead: true } });
};
export const Notification = mongoose.model<INotification,INotificationModel>('Notification', notificationSchema);
