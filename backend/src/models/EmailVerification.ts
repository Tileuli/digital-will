import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface EmailVerificationAttributes {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface EmailVerificationCreationAttributes
  extends Optional<EmailVerificationAttributes, 'id' | 'attempts'> {}

class EmailVerification
  extends Model<EmailVerificationAttributes, EmailVerificationCreationAttributes>
  implements EmailVerificationAttributes
{
  public id!: string;
  public email!: string;
  public code_hash!: string;
  public attempts!: number;
  public expires_at!: Date;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

EmailVerification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    code_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'email_verifications',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default EmailVerification;
