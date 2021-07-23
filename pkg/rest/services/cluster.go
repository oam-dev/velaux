package services

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	echo "github.com/labstack/echo/v4"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/config"

	"github.com/oam-dev/velacp/pkg/proto/model"
	"github.com/oam-dev/velacp/pkg/rest/apis"
	initClient "github.com/oam-dev/velacp/pkg/rest/client"
)

type ClusterService struct {
	k8sClient client.Client
}

func NewClusterService() (*ClusterService, error) {
	client, err := initClient.NewK8sClient()
	if err != nil {
		return nil, fmt.Errorf("create client for clusterService failed")
	}
	return &ClusterService{
		k8sClient: client,
	}, nil
}

func (s *ClusterService) GetClusterNames(c echo.Context) error {
	var cmList v1.ConfigMapList
	labels := &metav1.LabelSelector{
		MatchLabels: map[string]string{
			"cluster": "configdata",
		},
	}
	selector, err := metav1.LabelSelectorAsSelector(labels)
	if err != nil {
		return err
	}
	err = s.k8sClient.List(context.Background(), &cmList, &client.ListOptions{
		LabelSelector: selector,
	})
	if err != nil {
		return err
	}

	names := []string{}
	for i := range cmList.Items {
		names = append(names, cmList.Items[i].Name)
	}

	return c.JSON(http.StatusOK, apis.ClustersMeta{Clusters: names})
}

func (s *ClusterService) ListClusters(c echo.Context) error {

	var cmList v1.ConfigMapList
	labels := &metav1.LabelSelector{
		MatchLabels: map[string]string{
			"cluster": "configdata",
		},
	}
	selector, err := metav1.LabelSelectorAsSelector(labels)
	if err != nil {
		return err
	}
	err = s.k8sClient.List(context.Background(), &cmList, &client.ListOptions{
		LabelSelector: selector,
	})
	if err != nil {
		return err
	}
	var clusterList = make([]*model.Cluster, len(cmList.Items))
	for i, c := range cmList.Items {
		UpdateInt, err := strconv.ParseInt(cmList.Items[i].Data["UpdatedAt"], 10, 64)
		if err != nil {
			return err
		}
		cluster := model.Cluster{
			Name:      c.Name,
			UpdatedAt: UpdateInt,
			Desc:      cmList.Items[i].Data["Desc"],
		}
		clusterList = append(clusterList, &cluster)
	}

	return c.JSON(http.StatusOK, model.ClusterListResponse{Clusters: clusterList})
}

func (s *ClusterService) GetCluster(c echo.Context) error {
	clusterName := c.QueryParam("clusterName")

	var cm v1.ConfigMap
	err := s.k8sClient.Get(context.Background(), client.ObjectKey{Namespace: DefaultUINamespace, Name: clusterName}, &cm)
	if err != nil {
		return fmt.Errorf("unable to find configmap parameters in %s:%s ", clusterName, err.Error())
	}
	var cluster model.Cluster
	cluster.Name = cm.Data["Name"]
	cluster.Desc = cm.Data["Desc"]
	cluster.UpdatedAt, err = strconv.ParseInt(cm.Data["UpdatedAt"], 10, 64)
	if err != nil {
		return fmt.Errorf("unable to resolve update parameter in %s:%s ", clusterName, err.Error())
	}
	cluster.Kubeconfig = cm.Data["Kubeconfig"]
	return c.JSON(http.StatusOK, model.ClusterResponse{Cluster: &cluster})
}

func (s *ClusterService) AddCluster(c echo.Context) error {
	clusterReq := new(apis.ClusterRequest)
	if err := c.Bind(clusterReq); err != nil {
		return err
	}
	var cm v1.ConfigMap
	err := s.k8sClient.Get(context.Background(), client.ObjectKey{Namespace: DefaultUINamespace, Name: clusterReq.Name}, &cm)
	if err != nil && apierrors.IsNotFound(err) {
		// not found
		conf, err := config.GetConfig() // need to change interface for multi-cluster management
		if err != nil {
			return err
		}
		var cm *v1.ConfigMap
		configdata := map[string]string{
			"Name":      clusterReq.Name,
			"Desc":      clusterReq.Desc,
			"UpdatedAt": time.Now().String(),
			"Kubecofig": conf.String(),
		}
		cm, err = s.ToConfigMap(clusterReq.Name, DefaultUINamespace, configdata)
		if err != nil {
			return fmt.Errorf("convert config map failed %s ", err.Error())
		}
		err = s.k8sClient.Create(context.Background(), cm)
		if err != nil {
			return fmt.Errorf("unable to create configmap for %s : %s ", clusterReq.Name, err.Error())
		}
	} else {
		// found
		return c.JSON(http.StatusInternalServerError, fmt.Sprintf("cluster %s exist", clusterReq.Name))
	}
	cluster := convertToCluster(clusterReq)
	return c.JSON(http.StatusCreated, apis.ClusterMeta{Cluster: &cluster})
}

func (s *ClusterService) UpdateCluster(c echo.Context) error {
	clusterReq := new(apis.ClusterRequest)
	if err := c.Bind(clusterReq); err != nil {
		return err
	}
	cluster := convertToCluster(clusterReq)
	var cm *v1.ConfigMap
	configdata := map[string]string{
		"Name":      clusterReq.Name,
		"Desc":      clusterReq.Desc,
		"UpdatedAt": time.Now().String(),
		"Kubecofig": clusterReq.Kubeconfig,
	}
	cm, err := s.ToConfigMap(clusterReq.Name, DefaultUINamespace, configdata)
	if err != nil {
		return fmt.Errorf("convert config map failed %s ", err.Error())
	}
	err = s.k8sClient.Update(context.Background(), cm)
	if err != nil {
		return fmt.Errorf("unable to update configmap for %s : %s ", clusterReq.Name, err.Error())
	}
	return c.JSON(http.StatusOK, apis.ClusterMeta{Cluster: &cluster})
}

func (s *ClusterService) DelCluster(c echo.Context) error {
	clusterName := c.Param("clusterName")
	var cm v1.ConfigMap
	cm.SetName(clusterName)
	cm.SetNamespace(DefaultUINamespace)
	if err := s.k8sClient.Delete(context.Background(), &cm); err != nil {
		return c.JSON(http.StatusInternalServerError, false)
	}
	return c.JSON(http.StatusOK, true)
}

// checkClusterExist check whether cluster exist with name
func (s *ClusterService) checkClusterExist(clusterName string) (bool, error) {
	var cm v1.ConfigMap
	err := s.k8sClient.Get(context.Background(), client.ObjectKey{Namespace: DefaultUINamespace, Name: clusterName}, &cm)
	if err != nil && apierrors.IsNotFound(err) { // not found
		return false, err
	} else { // found
		return true, nil
	}
}

// convertToCluster get cluster model from request
func convertToCluster(clusterReq *apis.ClusterRequest) model.Cluster {
	return model.Cluster{
		Name:       clusterReq.Name,
		Desc:       clusterReq.Desc,
		UpdatedAt:  time.Now().Unix(),
		Kubeconfig: clusterReq.Kubeconfig,
	}
}

func (s *ClusterService) ToConfigMap(name, namespace string, configData map[string]string) (*v1.ConfigMap, error) {
	var cm = v1.ConfigMap{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ConfigMap",
		},
	}
	cm.SetName(name)
	cm.SetNamespace(namespace)
	cm.SetLabels(map[string]string{
		"cluster": "configdata",
	})
	cm.Data = configData
	return &cm, nil
}
