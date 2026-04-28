import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface TrustedConfirmerAttributes {
  id: string;
  user_id: string;
  email: string;
  name: string;
  relationship?: string | null;
  invitation_token_hash?: string | null;
  accepted_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface TrustedConfirmerCreationAttributes
  extends Optional<
    TrustedConfirmerAttributes,
    'id' | 'relationship' | 'invitation_token_hash' | 'accepted_at'
  > {}

class TrustedConfirmer
  extends Model<TrustedConfirmerAttributes, TrustedConfirmerCreationAttributes>
  implements TrustedConfirmerAttributes
{
  public id!: string;
  public user_id!: string;
  public email!: string;
  public name!: string;
  public relationship?: string | null;
  public invitation_token_hash?: string | null;
  public accepted_at?: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TrustedConfirmer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    email: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    relationship: { type: DataTypes.STRING(100), allowNull: true },
    invitation_token_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    accepted_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  {
    sequelize,
    tableName: 'trusted_confirmers',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['user_id'] }],
  }
);

User.hasMany(TrustedConfirmer, {
  foreignKey: 'user_id',
  as: 'trusted_confirmers',
});
TrustedConfirmer.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

export default TrustedConfirmer;
