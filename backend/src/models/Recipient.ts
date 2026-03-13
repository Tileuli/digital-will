import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface RecipientAttributes {
  id: string;
  user_id: string;
  email: string;
  name: string;
  public_key?: string;
  relationship?: string;
  notification_sent: boolean;
  access_granted: boolean;
  access_granted_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface RecipientCreationAttributes extends Optional<RecipientAttributes, 
  'id' | 'notification_sent' | 'access_granted'> {}

class Recipient extends Model<RecipientAttributes, RecipientCreationAttributes> 
  implements RecipientAttributes {
  
  public id!: string;
  public user_id!: string;
  public email!: string;
  public name!: string;
  public public_key?: string;
  public relationship?: string;
  public notification_sent!: boolean;
  public access_granted!: boolean;
  public access_granted_at?: Date;
  
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
    relationship: {
      type: DataTypes.STRING(100),
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