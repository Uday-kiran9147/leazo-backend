// schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId })
  ownerId?: Types.ObjectId;

  @Prop({ default: '' })
  firstName!: string;

  @Prop({ default: '' })
  lastName!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true, select: false }) // never return password by default
  password!: string;

  @Prop()
  phoneNumber!: string;

  @Prop()
  deviceToken?: string;

  @Prop({ default: false })
  isOwner!: boolean;

  @Prop({ default: 'User' })
  role!: string;

  @Prop({
    enum: ['tenant_free', 'tenant_smart_finder', 'tenant_premium'],
    default: 'tenant_free',
  })
  planId!: string;

  @Prop()
  subscriptionId?: string;

  @Prop({ default: Date.now })
  planActivatedAt?: Date;

  @Prop()
  planExpiresAt?: Date;

  @Prop({ type: { ownerContactsUsed: { type: Number, default: 0 } }, default: {} })
  usage!: { ownerContactsUsed: number };

  @Prop({ default: false })
  autoRenew!: boolean;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Email validation at DB layer
UserSchema.path('email').validate((value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}, 'Invalid email format');

// Password hashing hook — kept here since it's genuinely schema-level concern
import * as bcrypt from 'bcrypt';
UserSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Cascade delete owner
UserSchema.pre('findOneAndDelete', async function () {
  const user = await this.model.findOne(this.getQuery());
  if (user?.ownerId) {
    await this.model.db.model('Owner').findByIdAndDelete(user.ownerId);
  }
});