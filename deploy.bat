
echo Deploying database...
call k ngym apply -f ./kubernetes.yaml

echo Deploying api...
cd api
docker build -t docker.io/stephanzlatarev/norman-gym-api .
docker push docker.io/stephanzlatarev/norman-gym-api
call k ngym apply -f ./kubernetes.yaml
cd ..

echo Deploying trainer...
cd trainer
docker build -t docker.io/stephanzlatarev/norman-gym-trainer .
docker push docker.io/stephanzlatarev/norman-gym-trainer
call k ngym apply -f ./kubernetes.yaml
cd ..

echo Deploying doctor...
cd doctor
docker build -t docker.io/stephanzlatarev/norman-gym-doctor .
docker push docker.io/stephanzlatarev/norman-gym-doctor
call k ngym apply -f ./kubernetes.yaml
cd ..

echo Deploying web...
cd web
docker build -t docker.io/stephanzlatarev/norman-gym-web .
docker push docker.io/stephanzlatarev/norman-gym-web
call k ngym apply -f ./kubernetes.yaml
cd ..
