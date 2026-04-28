import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import TrustedConfirmer from './TrustedConfirmer';

interface DeathVoteAttributes {
  id: string;
  user_id: string;
  confirmer_id: string;
  round_id: number;
  vote: 'yes' | 'no';
  voted_at: Date;
  created_at?: Date;
}

interface DeathVoteCreationAttributes
  extends Optional<DeathVoteAttributes, 'id' | 'voted_at'> {}

class DeathVote
  extends Model<DeathVoteAttributes, DeathVoteCreationAttributes>
  implements DeathVoteAttributes
{
  public id!: string;
  public user_id!: string;
  public confirmer_id!: string;
  public round_id!: number;
  public vote!: 'yes' | 'no';
  public voted_at!: Date;
  public readonly created_at!: Date;
}

DeathVote.init(
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
    confirmer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: TrustedConfirmer, key: 'id' },
      onDelete: 'CASCADE',
    },
    round_id: { type: DataTypes.INTEGER, allowNull: false },
    vote: { type: DataTypes.ENUM('yes', 'no'), allowNull: false },
    voted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'death_votes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['user_id', 'round_id'] },
      { fields: ['user_id', 'round_id', 'confirmer_id'], unique: true },
    ],
  }
);

User.hasMany(DeathVote, { foreignKey: 'user_id', as: 'death_votes' });
DeathVote.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
TrustedConfirmer.hasMany(DeathVote, {
  foreignKey: 'confirmer_id',
  as: 'votes',
});
DeathVote.belongsTo(TrustedConfirmer, {
  foreignKey: 'confirmer_id',
  as: 'confirmer',
});

export default DeathVote;
