
echo Deploying networking and database...
call gym apply -f ./kubernetes.yaml

echo Deploying api...
docker build -f ./api/Dockerfile -t docker.io/stephanzlatarev/norman-gym-api .
docker push docker.io/stephanzlatarev/norman-gym-api
call gym apply -f ./api/kubernetes.yaml

echo Deploying trainer...
docker build -f ./trainer/Dockerfile -t docker.io/stephanzlatarev/norman-gym-trainer .
docker push docker.io/stephanzlatarev/norman-gym-trainer
call gym apply -f ./trainer/kubernetes.yaml

echo Deploying player...
docker build -f ./player/Dockerfile -t docker.io/stephanzlatarev/norman-gym-player .
docker push docker.io/stephanzlatarev/norman-gym-player
call gym apply -f ./player/kubernetes.yaml

REM echo Deploying doctor...
REM cd doctor
REM docker build -t docker.io/stephanzlatarev/norman-gym-doctor .
REM docker push docker.io/stephanzlatarev/norman-gym-doctor
REM call gym apply -f ./kubernetes.yaml
REM cd ..

echo Deploying web...
cd web
docker build -t docker.io/stephanzlatarev/norman-gym-web .
docker push docker.io/stephanzlatarev/norman-gym-web
call gym apply -f ./kubernetes.yaml
cd ..
