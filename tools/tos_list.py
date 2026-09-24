import yaml, os, sys, bytedtos
cfg = yaml.safe_load(open(os.path.expanduser("~/nebuconfig.yaml")))
c = bytedtos.Client(cfg["tos_bucket"], cfg["tos_user_access_key"], idc=cfg["tos_idc"],
                    timeout=60, connect_timeout=30)
pref = sys.argv[1]
r = c.list_prefix(pref, "", "", 300)
d = (r.json if hasattr(r, "json") else r)["payload"]
objs = d.get("objects") or []
print("objects under", pref, ":", len(objs), "truncated:", d.get("isTruncated"))
for o in objs[:30]:
    print("   %10d  %s  %s" % (o.get("size", 0), str(o.get("lastModified", ""))[:19], o["key"]))
