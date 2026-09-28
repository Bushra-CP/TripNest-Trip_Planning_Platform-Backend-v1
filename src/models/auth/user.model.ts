import mongoose, { Schema } from "mongoose";
import { IUser } from "../../interfaces/IModel/IUser";
import { AuthProvider } from "../../enums/auth-provider.enum";
import { UserRole } from "../../enums/user-role.enum";

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    provider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.LOCAL,
    },
    providerId: {
      type: String,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.TRAVELER,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,

    // Include virtual fields when converting documents to JSON.
    toJSON: {
      virtuals: true,
    },

    // Include virtual fields when converting documents to objects.
    toObject: {
      virtuals: true,
    },
  },
);

// Connect User with its TravelerProfile.
userSchema.virtual("travelerProfile", {
  ref: "TravelerProfile",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
