import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface CheckinLogAttributes {
  id: string;
  user_id: string;
  checkin_date: Date;
  method?: string;
  ip_address?: string;
  user_agent?: string;
}

interface CheckinLogCreationAttributes extends Optional<CheckinLogAttributes, 'id' | 'checkin_date'> {}

class CheckinLog extends Model<CheckinLogAttributes, CheckinLogCreationAttributes> 
  implements CheckinLogAttributes {
  
  public id!: string;
  public user_id!: string;
  public checkin_date!: Date;
  public method?: string;
  public ip_address?: string;
  public user_agent?: string;
}

CheckinLog.init(
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
    checkin_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'checkin_logs',
    underscored: true,
    timestamps: false,
  }
);

User.hasMany(CheckinLog, { foreignKey: 'user_id', as: 'checkin_logs' });
CheckinLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default CheckinLog;