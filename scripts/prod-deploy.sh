cp /root/apps/TylerCraft/script/tylercraft.service /etc/systemd/system/tylercraft.service

sudo systemctl daemon-reload
sudo systemctl enable tylercraft
sudo systemctl start tylercraft

