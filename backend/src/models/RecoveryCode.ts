import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface RecoveryCodeAttributes {
  id: string;
  user_id: string;
  code_hash: string;
  kdf_salt: string;
  encrypted_private_key: string;
  kdf_algorithm: 'pbkdf2' | 'argon2id';
  used_at?: Date | null;
  created_at?: Date;
}

interface RecoveryCodeCreationAttributes
  extends Optional<RecoveryCodeAttributes, 'id' | 'used_at' | 'kdf_algorithm'> {}

class RecoveryCode
  extends Model<RecoveryCodeAttributes, RecoveryCodeCreationAttributes>
  implements RecoveryCodeAttributes {
  public id!: string;
  public user_id!: string;
  public code_hash!: string;
  public kdf_salt!: string;
  public encrypted_private_key!: string;
  public kdf_algorithm!: 'pbkdf2' | 'argon2id';
  public used_at?: Date | null;
  public readonly created_at!: Date;
}

RecoveryCode.init(
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
    code_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    kdf_salt: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    encrypted_private_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    kdf_algorithm: {
      type: DataTypes.ENUM('pbkdf2', 'argon2id'),
      allowNull: false,
      defaultValue: 'pbkdf2',
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'recovery_codes',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
    indexes: [{ fields: ['code_hash'], unique: true }],
  }
);

User.hasMany(RecoveryCode, { foreignKey: 'user_id', as: 'recovery_codes' });
RecoveryCode.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default RecoveryCode;
