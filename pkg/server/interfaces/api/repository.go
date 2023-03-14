/*
Copyright 2021 The KubeVela Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package api

import (
	"strconv"

	"github.com/kubevela/velaux/pkg/server/utils/registries"

	restfulspec "github.com/emicklei/go-restful-openapi/v2"
	"github.com/emicklei/go-restful/v3"

	"github.com/oam-dev/kubevela/pkg/utils"

	"github.com/kubevela/velaux/pkg/server/domain/service"
	v1 "github.com/kubevela/velaux/pkg/server/interfaces/api/dto/v1"
	"github.com/kubevela/velaux/pkg/server/utils/bcode"
)

type repository struct {
	HelmService  service.HelmService  `inject:""`
	ImageService service.ImageService `inject:""`
	RbacService  service.RBACService  `inject:""`
}

// NewRepository will return the repository
func NewRepository() Interface {
	return &repository{}
}

func (h repository) GetWebServiceRoute() *restful.WebService {
	ws := new(restful.WebService)
	ws.Path(versionPrefix+"/repository").
		Consumes(restful.MIME_XML, restful.MIME_JSON).
		Produces(restful.MIME_JSON, restful.MIME_XML).
		Doc("api for helm")

	tags := []string{"repository", "helm"}

	// List chart repos
	ws.Route(ws.GET("/chart_repos").To(h.listRepo).
		Doc("list chart repo").
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("project", "the config project").DataType("string").Required(true)).
		Filter(h.RbacService.CheckPerm("project/config", "list")).
		Returns(200, "OK", []string{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes([]string{}))

	// List charts
	ws.Route(ws.GET("/charts").To(h.listCharts).
		Doc("list charts").
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("repoUrl", "helm repository url").DataType("string")).
		Param(ws.QueryParameter("secretName", "secret of the repo").DataType("string")).
		Returns(200, "OK", []string{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes([]string{}))

	// List available chart versions
	ws.Route(ws.GET("/chart/versions").To(h.listVersionsFromQuery).
		Doc("list versions").
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("chart", "helm chart").DataType("string").Required(true)).
		Param(ws.QueryParameter("repoUrl", "helm repository url").DataType("string").Required(true)).
		Param(ws.QueryParameter("secretName", "secret of the repo").DataType("string")).
		Returns(200, "OK", v1.ChartVersionListResponse{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes([]string{}))

	ws.Route(ws.GET("/charts/{chart}/versions").To(h.listChartVersions).
		Doc("list versions").Deprecate().
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("repoUrl", "helm repository url").DataType("string")).
		Param(ws.QueryParameter("secretName", "secret of the repo").DataType("string")).
		Returns(200, "OK", v1.ChartVersionListResponse{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes([]string{}))

	// List available chart versions
	ws.Route(ws.GET("/chart/values").To(h.chartValues).
		Doc("get chart value").
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("chart", "helm chart").DataType("string").Required(true)).
		Param(ws.QueryParameter("version", "helm chart version").DataType("string").Required(true)).
		Param(ws.QueryParameter("repoUrl", "helm repository url").DataType("string").Required(true)).
		Param(ws.QueryParameter("repoType", "helm repository type").DataType("string").Required(true)).
		Param(ws.QueryParameter("secretName", "secret of the repo").DataType("string")).
		Returns(200, "OK", "").
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes(map[string]string{}))

	ws.Route(ws.GET("/charts/{chart}/versions/{version}/values").To(h.getChartValues).
		Doc("get chart value").Deprecate().
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("repoUrl", "helm repository url").DataType("string")).
		Param(ws.QueryParameter("secretName", "secret of the repo").DataType("string")).
		Returns(200, "OK", map[string]interface{}{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes(map[string]interface{}{}))

	ws.Route(ws.GET("/image/repos").To(h.getImageRepos).
		Doc("get the oci repos").
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("project", "the config project").DataType("string").Required(true)).
		Filter(h.RbacService.CheckPerm("project/config", "list")).
		Returns(200, "OK", v1.ListImageRegistryResponse{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes([]string{}))

	ws.Route(ws.GET("/image/info").To(h.getImageInfo).
		Doc("get the oci repos").
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("project", "the config project").DataType("string").Required(true)).
		Param(ws.QueryParameter("name", "the image name").DataType("string").Required(true)).
		Param(ws.QueryParameter("secretName", "the secret name of the image repository").DataType("string")).
		Filter(h.RbacService.CheckPerm("project/config", "list")).
		Returns(200, "OK", v1.ImageInfo{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes([]string{}))

	ws.Route(ws.POST("/registrysecrets/verify").To(h.verifyRepositorySecret).
		Doc("Verify image repository secret.").
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Filter(h.RbacService.CheckPerm("project/config", "list")).
		Param(ws.QueryParameter("project", "the config project").DataType("string").Required(true)).
		Param(ws.QueryParameter("name", "the config").DataType("string").Required(true)).
		Reads(v1.CreateConfigRequest{}).
		Returns(200, "OK", v1.ValidateRepoResponse{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes(v1.ValidateRepoResponse{}))

	ws.Route(ws.GET("/repositorytags").To(h.getRepositoryTags).
		Metadata(restfulspec.KeyOpenAPITags, tags).
		Param(ws.QueryParameter("project", "the config project").DataType("string").Required(true)).
		Param(ws.QueryParameter("secretName", "Secret name of the image repository credential, left empty means anonymous fetch.")).
		Param(ws.QueryParameter("repository", "Repository to query, e.g. calico/cni.").Required(true)).
		Filter(h.RbacService.CheckPerm("project/config", "list")).
		Doc("List repository tags, this is an experimental API, use it by your own caution.").
		Returns(200, "OK", registries.RepositoryTags{}).
		Returns(400, "Bad Request", bcode.Bcode{}).
		Writes(registries.RepositoryTags{}))

	ws.Filter(authCheckFilter)
	return ws
}

func (h repository) listCharts(req *restful.Request, res *restful.Response) {
	url := utils.Sanitize(req.QueryParameter("repoUrl"))
	secName := utils.Sanitize(req.QueryParameter("secretName"))
	skipCache, err := isSkipCache(req)
	if err != nil {
		bcode.ReturnError(req, res, bcode.ErrSkipCacheParameter)
		return
	}
	charts, err := h.HelmService.ListChartNames(req.Request.Context(), url, secName, skipCache)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(charts)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func (h repository) listVersionsFromQuery(req *restful.Request, res *restful.Response) {
	url := req.QueryParameter("repoUrl")
	chartName := req.QueryParameter("chart")
	secName := req.QueryParameter("secretName")
	skipCache, err := isSkipCache(req)
	if err != nil {
		bcode.ReturnError(req, res, bcode.ErrSkipCacheParameter)
		return
	}

	versions, err := h.HelmService.ListChartVersions(req.Request.Context(), url, chartName, secName, skipCache)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(v1.ChartVersionListResponse{Versions: versions})
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func (h repository) getChartValues(req *restful.Request, res *restful.Response) {
	url := req.QueryParameter("repoUrl")
	secName := req.QueryParameter("secretName")
	chartName := req.PathParameter("chart")
	version := req.PathParameter("version")
	skipCache, err := isSkipCache(req)
	if err != nil {
		bcode.ReturnError(req, res, bcode.ErrSkipCacheParameter)
		return
	}

	values, err := h.HelmService.GetChartValues(req.Request.Context(), url, chartName, version, secName, "helm", skipCache)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(values)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func (h repository) listChartVersions(req *restful.Request, res *restful.Response) {
	url := req.QueryParameter("repoUrl")
	chartName := req.PathParameter("chart")
	secName := req.QueryParameter("secretName")
	skipCache, err := isSkipCache(req)
	if err != nil {
		bcode.ReturnError(req, res, bcode.ErrSkipCacheParameter)
		return
	}
	versions, err := h.HelmService.ListChartVersions(req.Request.Context(), url, chartName, secName, skipCache)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(v1.ChartVersionListResponse{Versions: versions})
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func (h repository) chartValues(req *restful.Request, res *restful.Response) {
	url := req.QueryParameter("repoUrl")
	secName := req.QueryParameter("secretName")
	chartName := req.QueryParameter("chart")
	version := req.QueryParameter("version")
	repoType := req.QueryParameter("repoType")
	skipCache, err := isSkipCache(req)
	if err != nil {
		bcode.ReturnError(req, res, bcode.ErrSkipCacheParameter)
		return
	}

	values, err := h.HelmService.ListChartValuesFiles(req.Request.Context(), url, chartName, version, secName, repoType, skipCache)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(values)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func (h repository) listRepo(req *restful.Request, res *restful.Response) {
	project := req.QueryParameter("project")
	repos, err := h.HelmService.ListChartRepo(req.Request.Context(), project)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(repos)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func (h repository) getImageRepos(req *restful.Request, res *restful.Response) {
	project := req.QueryParameter("project")
	repos, err := h.ImageService.ListImageRepos(req.Request.Context(), project)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(v1.ListImageRegistryResponse{Registries: repos})
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}

}

func (h repository) getImageInfo(req *restful.Request, res *restful.Response) {
	project := req.QueryParameter("project")
	imageInfo := h.ImageService.GetImageInfo(req.Request.Context(), project, req.QueryParameter("secretName"), req.QueryParameter("name"))
	err := res.WriteEntity(imageInfo)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func (h repository) verifyRepositorySecret(req *restful.Request, res *restful.Response) {
	// Verify the validity of parameters
	var verifyReq v1.CreateConfigRequest
	if err := req.ReadEntity(&verifyReq); err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	if err := validate.Struct(&verifyReq); err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	project := req.QueryParameter("project")
	validateRepo, err := h.ImageService.ValidateImageRepoSecret(req.Request.Context(), project, verifyReq)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(validateRepo)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

// getRepositoryTags fetchs all tags of given repository, no paging.
func (h repository) getRepositoryTags(req *restful.Request, res *restful.Response) {
	project := req.QueryParameter("project")
	secretName := req.QueryParameter("secretName")
	repository := req.QueryParameter("repository")

	repositoryTags, err := h.ImageService.GetRepositoryTags(req.Request.Context(), project, secretName, repository)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
	err = res.WriteEntity(repositoryTags)
	if err != nil {
		bcode.ReturnError(req, res, err)
		return
	}
}

func isSkipCache(req *restful.Request) (bool, error) {
	skipStr := req.QueryParameter("skipCache")
	skipCache := false
	var err error
	if skipStr != "" {
		if skipCache, err = strconv.ParseBool(skipStr); err != nil {
			return skipCache, err
		}
	}
	return skipCache, nil
}
