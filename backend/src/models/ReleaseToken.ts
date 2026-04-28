import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Recipient from './Recipient';
import User from './User';

interface ReleaseTokenAttributes {
  id: string;
  recipient_id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at?: Date | null;
}

interface ReleaseTokenCreationAttributes
  extends Optional<ReleaseTokenAttributes, 'id' | 'used_at'> {}

class ReleaseToken extends Model<
  ReleaseTokenAttributes,
  ReleaseTokenCreationAttributes
> implements ReleaseTokenAttributes {
  public id!: string;
  public recipient_id!: string;
  public user_id!: string;
  public token_hash!: string;
  public expires_at!: Date;
  public used_at?: Date | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ReleaseToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Recipient, key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'release_tokens',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Recipient.hasMany(ReleaseToken, { foreignKey: 'recipient_id', as: 'release_tokens' });
ReleaseToken.belongsTo(Recipient, { foreignKey: 'recipient_id', as: 'recipient' });
User.hasMany(ReleaseToken, { foreignKey: 'user_id', as: 'release_tokens' });
ReleaseToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default ReleaseToken;
