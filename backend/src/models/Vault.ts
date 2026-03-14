import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface VaultAttributes {
  id: string;
  user_id: string;
  encrypted_data: string;
  metadata?: any;
  is_active: boolean;
  release_triggered: boolean;
  release_triggered_at?: Date | null;
}

interface VaultCreationAttributes extends Optional<VaultAttributes, 
  'id' | 'is_active' | 'release_triggered'> {}

class Vault extends Model<VaultAttributes, VaultCreationAttributes> 
  implements VaultAttributes {
  
  public id!: string;
  public user_id!: string;
  public encrypted_data!: string;
  public metadata?: any;
  public is_active!: boolean;
  public release_triggered!: boolean;
  public release_triggered_at?: Date | null;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Vault.init(
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
    encrypted_data: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    release_triggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    release_triggered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'vaults',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

User.hasMany(Vault, { foreignKey: 'user_id', as: 'vaults' });
Vault.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default Vault;