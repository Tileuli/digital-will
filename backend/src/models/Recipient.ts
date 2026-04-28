import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

export type InvitationStatus = 'pending' | 'accepted';

interface RecipientAttributes {
  id: string;
  user_id: string;
  email: string;
  name: string;
  public_key?: string;
  encrypted_private_key?: string;
  kdf_salt?: string;
  relationship?: string;
  invitation_status: InvitationStatus;
  invitation_token_hash?: string | null;
  invitation_expires_at?: Date | null;
  notification_sent: boolean;
  access_granted: boolean;
  access_granted_at?: Date;
  test_token_hash?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface RecipientCreationAttributes extends Optional<RecipientAttributes,
  'id' | 'notification_sent' | 'access_granted' | 'invitation_status' |
  'public_key' | 'encrypted_private_key' | 'kdf_salt' |
  'invitation_token_hash' | 'invitation_expires_at' | 'test_token_hash'> {}

class Recipient extends Model<RecipientAttributes, RecipientCreationAttributes>
  implements RecipientAttributes {

  public id!: string;
  public user_id!: string;
  public email!: string;
  public name!: string;
  public public_key?: string;
  public encrypted_private_key?: string;
  public kdf_salt?: string;
  public relationship?: string;
  public invitation_status!: InvitationStatus;
  public invitation_token_hash?: string | null;
  public invitation_expires_at?: Date | null;
  public notification_sent!: boolean;
  public access_granted!: boolean;
  public access_granted_at?: Date;
  public test_token_hash?: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Recipient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    public_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    encrypted_private_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    kdf_salt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    relationship: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    invitation_status: {
      type: DataTypes.ENUM('pending', 'accepted'),
      allowNull: false,
      defaultValue: 'pending',
    },
    invitation_token_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    invitation_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notification_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    access_granted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    access_granted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    test_token_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'recipients',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'email'],
        name: 'unique_user_recipient',
      },
    ],
  }
);

// Связи
User.hasMany(Recipient, { foreignKey: 'user_id', as: 'recipients' });
Recipient.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default Recipient;