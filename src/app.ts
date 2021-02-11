/* ADD  --> */
import { createPow, powTypes } from "@textile/powergate-client"
import bodyParser from "body-parser"
import express from "express"
import fileUpload from "express-fileupload"
import session from "express-session"
import fs from "fs"
import passport from "passport"
import path from "path"
import * as passportConfig from "./config/passport"
import { save, User } from "./models/user"
import { EXPRESS_PORT, POW_ADMIN_TOKEN, POW_HOST, SESSION_SECRET } from "./util/env"

console.log("POW_ADMIN_TOKEN: " + POW_ADMIN_TOKEN)
// Create Powergate instance
const pow = createPow({ host: POW_HOST })

if (POW_ADMIN_TOKEN) {
  pow.setAdminToken(POW_ADMIN_TOKEN)
}

// Create Express server
const app = express()

// Express configuration
app.set("port", EXPRESS_PORT || 3000)
app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }))
app.set("views", path.join(__dirname, "../views"))
app.set("view engine", "pug")
app.use(session({ resave: false, saveUninitialized: false, secret: SESSION_SECRET }))
app.use(passport.initialize())
app.use(passport.session())
app.use((req, res, next) => {
  res.locals.user = req.user
  next()
})
//parse requests
app.use(bodyParser.urlencoded({ extended: true }))

app.use(fileUpload())
/**
 * Primary app routes. 
app.get("/", async (_, res, next) => {
  try {
    const [respPeers, respAddr, respHealth, respMiners] = await Promise.all([
      pow.net.peers(),
      pow.net.listenAddr(),
      pow.health.check(),
      pow.miners.get(),
    ])
    res.render("home", {
      title: "Home",
      peers: null,
      listenAddr: null,
      health: null,
      miners: null,
    })
  } catch (e) {
    next(e)
  }
})
*/
app.get("/", async (_, res, next) => {
  try {
    const [buildInfo, host] = await Promise.all([pow.buildInfo(), pow.host])
    res.render("home", {
      title: "Home",
      info: buildInfo,
      host: host,
    })
  } catch (e) {
    next(e)
  }
})

app.get("/user", passportConfig.isAuthenticated, async (req, res, next) => {
  try {
    const existingUser = req.user as User
    if (existingUser.ffsToken) {
      pow.setToken(existingUser.ffsToken)
      console.log("Set user token to: " + existingUser.ffsToken)
    }

    const { id } = await pow.userId()
    const { addressesList } = await pow.wallet.addresses()
    res.render("user", {
      title: "Profile",
      id,
      token: existingUser.ffsToken,
      addressesList,
    })
  } catch (e) {
    next(e)
  }
})

app.get("/sendfil", async (req, res, next) => {
  const existingUser = req.user as User
  if (existingUser.ffsToken) {
    pow.setToken(existingUser.ffsToken)
    console.log("Set user token to: " + existingUser.ffsToken)
  }

  const { addressesList } = await pow.wallet.addresses()
  const address0 = addressesList[0].address
  try {
    res.render("sendfil", {
      title: "Send FIL",
      address0: address0,
    })
  } catch (e) {
    next(e)
  }
})

app.post("/sendfil_do", passportConfig.isAuthenticated, async (req, res, next) => {
  try {
    const existingUser = req.user as User
    if (existingUser.ffsToken) {
      pow.setToken(existingUser.ffsToken)
      console.log("Set user token to: " + existingUser.ffsToken)
    }
    console.log("Set user token to: " + existingUser.ffsToken)
    const rett = await pow.wallet.sendFil(req.body.FromAddress, req.body.ToAddress, req.body.FIL)
    console.log(
      "Sent " + req.body.FIL + " FIL to  " + req.body.ToAddress + " from " + req.body.FromAddress,
    )
    res.redirect("/user")
  } catch (e) {
    next(e)
  }
})

app.get("/users", passportConfig.isAuthenticated, async (_, res, next) => {
  try {
    const [userList] = await Promise.all([pow.admin.users.list()])

    res.render("users", {
      title: "Users",
      userList,
    })
  } catch (e) {
    next(e)
  }
})

app.get("/deals", passportConfig.isAuthenticated, async (_, res, next) => {
  try {
    const [dealDefault, dealsRetrievalList, dealsStorageList] = await Promise.all([
      pow.storageConfig.default(),
      pow.deals.retrievalDealRecords(),
      pow.deals.storageDealRecords({ includeFinal: true, includePending: true }),
    ])
    console.log("dealDefault")
    console.log(dealDefault)
    console.log("dealsRetrievalList")
    console.log(dealsRetrievalList)
    console.log("dealsStorageList")
    console.log(dealsStorageList)
    res.render("deals", {
      title: "Deals",
      dealDefault,
      dealsRetrievalList,
      dealsStorageList,
    })
  } catch (e) {
    next(e)
  }
})

app.get("/jobs", passportConfig.isAuthenticated, async (_, res, next) => {
  try {
    const [jobsList, jobsSummary] = await Promise.all([
      pow.storageJobs.list(),
      pow.storageJobs.summary(),
    ])
    console.log("jobs List:")
    console.log(jobsList)
    console.log("jobs summary:")
    console.log(jobsSummary)
    res.render("jobs", {
      title: "Jobs",
      jobsList,
      jobsSummary,
    })
  } catch (e) {
    next(e)
  }
})

app.post("/pin", async (req, res, next) => {
  if (!req.files) {
    return res.status(500).send({ msg: "file is not found" })
  }
  const myFile = req.files.target_file as fileUpload.UploadedFile
  myFile.mv(`${__dirname}/public/${myFile.name}`, function (err) {
    if (err) {
      console.log(err)
      return res.status(500).send({ msg: "Error occured" })
    }
    console.log("ERROR IN UPLOADING")
    // returing the response with file path and name
    // return res.send({name: myFile.name, path: `/${myFile.name}`});
  })

  // cache data in IPFS in preparation to store it
  const buffer = fs.readFileSync(`${__dirname}/public/${myFile.name}`)
  const { cid } = await pow.data.stage(buffer)

  // store the data using the default storage configuration
  const { jobId } = await pow.storageConfig.apply(cid)

  // watch the job status to see the storage process progressing
  const jobsCancel = pow.storageJobs.watch((job) => {
    if (job.status === powTypes.JobStatus.JOB_STATUS_CANCELED) {
      console.log("job canceled")
    } else if (job.status === powTypes.JobStatus.JOB_STATUS_FAILED) {
      console.log("job failed")
    } else if (job.status === powTypes.JobStatus.JOB_STATUS_SUCCESS) {
      console.log("job success!")
    }
  }, jobId)

  // watch all log events for a cid
  const logsCancel = pow.data.watchLogs((logEvent) => {
    console.log(`received event for cid ${logEvent.cid}`)
    const cidInfosList = pow.data.cidInfo(logEvent.cid)
    console.log(cidInfosList)
  }, cid)

  // get information about the latest applied storage configuration,
  // current storage state, and all related Powergate storage jobs
  const cidInfosList = await pow.data.cidInfo(cid)
  try {
    res.render("pin", {
      title: "Pin",
      resCid: cid,
      resJobId: jobId,
      resInfo: cidInfosList,
    })
  } catch (e) {
    next(e)
  }
})

app.get("/pin", async (_, res, next) => {
  try {
    // retrieve data stored in the user by cid
    //const bytes = await pow.data.get(cid)

    res.render("pin", {
      title: "Pin",
      resCid: null,
      resJobId: null,
      resInfo: null,
    })
  } catch (e) {
    next(e)
  }
})

app.post("/cid_info", passportConfig.isAuthenticated, async (req, res, next) => {
  try {
    const existingUser = req.user as User
    if (existingUser.ffsToken) {
      pow.setToken(existingUser.ffsToken)
      console.log("Set user token to: " + existingUser.ffsToken)
    }
    console.log("Set user token to: " + existingUser.ffsToken)
    const cidInfosList = await pow.data.cidInfo(req.body.CID)
    console.log(cidInfosList)
    res.render("cid_info", {
      title: "Cid Info",
      resCid: req.body.CID,
      cidInfosList,
    })
  } catch (e) {
    next(e)
  }
})

app.post("/cid_info_ajax", passportConfig.isAuthenticated, async (req, res, next) => {
  try {
    const existingUser = req.user as User
    if (existingUser.ffsToken) {
      pow.setToken(existingUser.ffsToken)
      console.log("Set user token to: " + existingUser.ffsToken)
    }
    console.log("Set user token to: " + existingUser.ffsToken)
    // const cidInfosList = await pow.data.cidInfo(req.body.CID)
    const cidInfosList = await pow.storageJobs.list()
    console.log(cidInfosList)
    res.json(cidInfosList)
  } catch (e) {
    next(e)
  }
})

app.post("/cid_get", passportConfig.isAuthenticated, async (req, res, next) => {
  try {
    const existingUser = req.user as User
    if (existingUser.ffsToken) {
      pow.setToken(existingUser.ffsToken)
      console.log("Set user token to: " + existingUser.ffsToken)
    }
    console.log("Set user token to: " + existingUser.ffsToken)
    const fileData = await pow.data.get(req.body.CID)
    //var fileContents = Buffer.from(fileData, "base64");

    res.writeHead(200, {
      "Content-Type": "image/jpg",
      "Content-Disposition": "attachment; filename=" + req.body.CID + ".jpg",
      "Content-Length": fileData.length,
    })
    res.end(fileData)
  } catch (e) {
    next(e)
  }
})

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  async (req, _, next) => {
    if (req.user) {
      const user = req.user as User
      if (user.ffsToken) {
        pow.setToken(user.ffsToken)

        console.log("Local user already exists:")
        console.log(req.user)
        //        console.log("user already exists:")
        console.log(user)
        return next()
      } else {
        try {
          const createResp = await pow.admin.users.create()
          console.log("created a new user:")
          console.log(createResp)
          user.ffsToken = createResp.user?.token
          await save(user)
          if (user.ffsToken) pow.setToken(user.ffsToken)
          next()
        } catch (e) {
          next(e)
        }
      }
    } else {
      next(new Error("no user found in session"))
    }
  },
  (_, res) => {
    res.redirect("/user")
  },
)
app.get("/logout", (req, res) => {
  req.logout()
  res.redirect("/")
})

/**
 * OAuth authentication routes for GitHub. (Sign in)
 */
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }))
app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  (_, res) => {
    res.redirect("/user")
  },
)

/**
 * OAuth authentication routes for Google. (Sign in)
 */
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }))
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (_, res) => {
    res.redirect("/user")
  },
)

/**
 * OAuth authentication routes for Twitter. (Sign in)
 */
app.get("/auth/twitter", passport.authenticate("twitter", { scope: ["user:email"] }))
app.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/" }),
  (_, res) => {
    res.redirect("/user")
  },
)

export default app 