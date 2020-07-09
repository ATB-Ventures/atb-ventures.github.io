# Build image for didaas-docs
docker build -t gcr.io/leap-0123/didaas/didaas-docs:latest .
kubectl config set-context docker-desktop
# Patch imagePullPolicy
sed -i -- 's/          imagePullPolicy: Always/          imagePullPolicy: IfNotPresent/g' ./k8s/*.yaml
# Deploy services
kubectl apply -f ./k8s/didaas-docs.yaml
# Patch imagePullPolicy
sed -i -- 's/          imagePullPolicy: IfNotPresent/          imagePullPolicy: Always/g' ./k8s/*.yaml

# Sleep to allow pod to start
sleep 10

# Port forwarding
kubectl port-forward service/didaas-docs 4567:4567