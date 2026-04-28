import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Vault from './Vault';
import Recipient from './Recipient';

interface VaultRecipientKeyAttributes {
  id: string;
  vault_id: string;
  recipient_id: string;
  wrapped_key: string;
}

interface VaultRecipientKeyCreationAttributes
  extends Optional<VaultRecipientKeyAttributes, 'id'> {}

class VaultRecipientKey extends Model<
  VaultRecipientKeyAttributes,
  VaultRecipientKeyCreationAttributes
> implements VaultRecipientKeyAttributes {
  public id!: string;
  public vault_id!: string;
  public recipient_id!: string;
  public wrapped_key!: string;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

VaultRecipientKey.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    vault_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Vault, key: 'id' },
      onDelete: 'CASCADE',
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Recipient, key: 'id' },
      onDelete: 'CASCADE',
    },
    wrapped_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'vault_recipient_keys',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['vault_id', 'recipient_id'],
        name: 'unique_vault_recipient_key',
      },
    ],
  }
);

Vault.hasMany(VaultRecipientKey, { foreignKey: 'vault_id', as: 'recipient_keys' });
VaultRecipientKey.belongsTo(Vault, { foreignKey: 'vault_id', as: 'vault' });
Recipient.hasMany(VaultRecipientKey, { foreignKey: 'recipient_id', as: 'vault_keys' });
VaultRecipientKey.belongsTo(Recipient, { foreignKey: 'recipient_id', as: 'recipient' });

export default VaultRecipientKey;
