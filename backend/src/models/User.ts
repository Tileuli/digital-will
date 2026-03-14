import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  public_key?: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;
  checkin_interval_days: number;
  last_checkin?: Date;
  next_checkin_due?: Date;
  reminder_sent_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'is_active'
    | 'checkin_interval_days'
    | 'last_checkin'
    | 'next_checkin_due'
    | 'reminder_sent_at'
  > {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public public_key?: string;
  public full_name?: string;
  public phone?: string;
  public is_active!: boolean;
  public checkin_interval_days!: number;
  public last_checkin?: Date;
  public next_checkin_due?: Date;
  public reminder_sent_at?: Date | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    public_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    checkin_interval_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      validate: {
        min: 1,
        max: 365,
      },
    },
    last_checkin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_checkin_due: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reminder_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default User;