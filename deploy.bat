
echo Deploying database...
call k ngym apply -f ./kubernetes.yaml

echo Deploying api...
cd api
docker build -t docker.io/stephanzlatarev/norman-gym-api .
docker push docker.io/stephanzlatarev/norman-gym-api
call k ngym apply -f ./kubernetes.yaml
cd ..

echo Deploying web...
cd web
docker build -t docker.io/stephanzlatarev/norman-gym-web .
docker push docker.io/stephanzlatarev/norman-gym-web
call k ngym apply -f ./kubernetes.yaml
cd ..
