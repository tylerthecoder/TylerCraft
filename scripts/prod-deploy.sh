cp /root/apps/TylerCraft/scripts/tylercraft.service /etc/systemd/system/tylercraft.service

sudo systemctl daemon-reload
sudo systemctl enable tylercraft
sudo systemctl start tylercraft
sudo systemctl restart tylercraft
